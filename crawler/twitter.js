'use strict';

global.fetch = require("node-fetch");


const cheerio = require('cheerio');
const Twitter = require('twitter');
const hashtags = ["savedyouaclick", "clickbait"].map(e => "#" + e);
// const hashtags = ["clickbait"].map(e => "#" + e);
const Url = require("url");
const fs = require('fs');
const {
    extract
} = require('article-parser');

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
};

const processed = new Set();


let writeQueue = [];
let writing = false;

function write(json) {
    let s = JSON.stringify(json);
    writeQueue.push(s);

    if (!writing)
        _write();
}

function _write() {
    writing = true;
    let data = writeQueue.join('\n') + "\n";
    writeQueue = [];
    fs.appendFile('./twitter.jsonl', data, 'utf8', function (err) {
        if (err) {
            console.error('Failed to write');
            console.error(err);
        }

        if (writeQueue.length)
            _write();
        else writing = false;
    })
}

/**
 * @type {Twitter}
 */
const twitterClient = new Twitter({
    consumer_key: 'EfCL5LdbULNNk1jIn2U0w9Zzy',
    consumer_secret: 'hsKJRctaxOVon0aqXqr9foN2ulsKTO6hc85VLprUrnSoe26LRU',
    access_token_key: '720191713038438401-bz305wHqUo1cHvicgI2V3wUQf0TGlNG',
    access_token_secret: 'H9Uqo5ngyTW0zZL4Gc6YcWoxlr1YuUEhu7P36tQ0uoaZf'
});

const launched = new Map();

function parseArticle(article) {

    article = {
        title: 'Zato ESB - Test demo hosted on company server',
        alias: 'zato-esb-test-demo-hosted-on-company-server-1500021746537-PAQXw8IYcU',
        url: 'https://www.youtube.com/watch?v=tRGJj59G1x4',
        canonicals:
            ['https://www.youtube.com/watch?v=tRGJj59G1x4',
                'https://youtu.be/tRGJj59G1x4',
                'https://www.youtube.com/v/tRGJj59G1x4',
                'https://www.youtube.com/embed/tRGJj59G1x4'],
        description: 'Our sample: https://github.com/greenglobal/zato-demo Zato homepage: https://zato.io Tutorial: "Zato — a powerful Python-based ESB solution for your SOA" http...',
        content: '<iframe src="https://www.youtube.com/embed/tRGJj59G1x4?feature=oembed" frameborder="0" allowfullscreen></iframe>',
        image: 'https://i.ytimg.com/vi/tRGJj59G1x4/hqdefault.jpg',
        author: 'Dong Nguyen',
        source: 'YouTube',
        domain: 'youtube.com',
        publishedTime: '',
        duration: 292
    };

    const $ = cheerio.load(article.content);

    let postTimestamp = null;
    if (article.publishedTime)
        postTimestamp = new Date(postTimestamp).toISOString();


    let finalForm = {
        "id": "608310377143799810",
        postTimestamp,
        "postText": [
            "Apple's iOS 9 'App thinning' feature will give your phone's storage a boost"
        ],
        "postMedia": [],
        "targetTitle": "Apple gives back gigabytes: iOS 9 'app thinning' feature will finally give your phone's storage a boost",
        "targetDescription": "'App thinning' will be supported on Apple's iOS 9 and later models. It ensures apps use the lowest amount of storage space by 'slicing' it to work on individual handsets (illustrated).",
        "targetKeywords": "Apple,gives,gigabytes,iOS,9,app,thinning,feature,finally,phone,s,storage,boost",
        "targetParagraphs": [
            "Paying for a 64GB phone only to discover that this is significantly reduced by system files and bloatware is the bane of many smartphone owner's lives. "],
        "targetCaptions": [
            "'App thinning' will be supported on Apple's iOS 9 and later models. It ensures apps use the lowest amount of storage space on a device by only downloading the parts it needs to run on individual handsets. It 'slices' the app into 'app variants' that only need to access the specific files on that specific device"
        ]
    };
}

// async function getArticle(urlString, context) {
//
//     if (processed.has(urlString))
//     let url = Url.parse(urlString);
//
//     let queue = launched.get(url.host);
//
//     if (queue) {
//         queue.push({
//             urlString,
//             context
//         });
//     } else {
//         queue = [];
//         launched.set(url.host, queue);
//
//         let article = await extract(urlString);
//         parseArticle(article, context);
//
//
//         for (let {urlString, context} of queue) {
//             await sleep(2000);
//             let article = await extract(urlString);
//             parseArticle(article, context);
//         }
//
//         launched.delete(url.host);
//     }
// }


async function getArticle(urlString, post, tag) {
    let url = Url.parse(urlString);

    let host = url.host || url.hostname;
    let queue = launched.get(host);

    if (queue) {
        queue.push({
            urlString,
            tag,
            post
        });
    } else {
        queue = [];
        launched.set(host, queue);

        let articleR = await fetch(urlString);
        let article = await articleR.text();
        write({article, post, tag, urlString});


        // black magic
        for (let {urlString, post, tag} of queue) {
            await sleep(2000);
            let articleR = await fetch(urlString);
            let article = await articleR.text();

            write({article, post, tag, urlString});

        }

        launched.delete(host);
    }
}

function processPost(post, tag) {

    let urls = post.entities.urls;

    if (!urls || !urls.length) {
        post._no_article = true;
        write({post, tag});
        return;
    }

    if (urls.length > 1)
        post._multiple_urls = true;

    for (let url of urls)
        if (!url.expanded_url.startsWith("https://twitter.com/i/web/status/")) {
            if (url.expanded_url.startsWith("https://twitter.com/"))
                console.log(`Url ${url.expanded_url} passed`);
            getArticle(url.expanded_url, post, tag);

        }


}



async function search(tag, max_id) {
    let response;
    try {
        response = await twitterClient.get("/search/tweets.json", {
            lang: "en",
            count: 100,
            q: tag,
            max_id,
            // until: "2019-03-24"
        });
    } catch (err) {
        console.error("Enc error");
        console.error(err);
        if (err[0] && err[0].code == 88) {
            sleep(1000 * 60).then(() => getTweet(id, tag));
        }

        return;
    }

    fs.appendFileSync(__dirname + "/save-game.jsonl", JSON.stringify(response));

    if (response.errors && result.errors[0] && response.errors[0].code === 88) {
        await sleep(1000 * 60);
        return search(...arguments);
    }

    let minId = "99999999999999999999999999999999999999999";

    for (let result of response.statuses) {
        if (result.id < (+minId) ||
            (result.id === (+minId) && (result.id_str < (+minId)))) {
            minId = result.id_str;
        }

        if (result.quoted_status && !result.quoted_status.truncated && !processed.has(result.quoted_status_id_str)) {
            processed.add(result.quoted_status_id_str);
            processPost(result.quoted_status, tag);
        } else {
            let id = result.in_reply_to_status_id_str || (result.quoted_status && result.quoted_status.id_str);
            if (id && !processed.has(id)) {
                processed.add(id);
                getTweet(id, tag);
            }

        }
    }

    console.log(minId);

    if (max_id === minId) {
        console.log(`Done with ${tag}`);
        return;
    }

    await sleep(700);
    return search(tag, minId);
}


function getTweet(id, tag) {
    twitterClient.get("/statuses/show.json", {
        id
    }, function (err, result) {
        if (err) {
            console.error("Unable to retrieve original tweet");
            console.error(err);
            if (err[0] && err[0].code == 88) {
                sleep(1000 * 60).then(() => getTweet(id, tag));
            }
        } else {
            if (result.errors && result.errors[0] && result.errors[0].code === 88) {
                sleep(1000 * 60).then(() => getTweet(id, tag));
            }

            processPost(result, tag)
        }
    });
}


for (let hashtag of hashtags)
    search(hashtag);

//{ "errors": [ { "code": 88, "message": "Rate limit exceeded" } ] }

//
//
// async function test() {
//     let r = await fetch('https:\/\/t.co\/eUcSLlrsQH');
//
//
//     let t = await r.text();
//
//     console.log(t);
//
//     const $ = cheerio.load(t);
//
//
//     console.log(r);
// }
//
// test();
