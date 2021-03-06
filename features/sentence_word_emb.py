from nltk import word_tokenize
import numpy as np

from pymagnitude import *

class GloVeFeatures():

  def __init__(self, logger):
    self.logger = logger
    self.embedding_dict = {}
    self._load_glove_pretrained()
    self.colnames = ["EMB_" + str(i+1) for i in range(int(logger.config_dict['EMB_SIZE']))]
    self.logger.log("Init sentence emb average extractor with {} dims".format(logger.config_dict['EMB_SIZE']))


  def _load_glove_pretrained(self):

    self.logger.log("Start loading GloVe Twitter pretrained word embeddings ...")
    self.vectors = Magnitude(self.logger.get_data_file(self.logger.config_dict['GLOVE_FILE']))
    self.logger.log("Finished loading GloVe", show_time = True)


  def compute_features_per_sentence(self, text):

    if len(text) == 0:
      return [-1 for i in range(len(self.colnames))]

    words = [word.lower() for word in word_tokenize(text)]

    sentence_emb = []
    for word in words:
      word_emb = self.vectors.query(word)
      sentence_emb.append(word_emb)
      
    if sentence_emb == []:
      return [-1 for i in range(len(self.colnames))]
    else:
      sentence_emb = np.array(sentence_emb)

    return np.average(sentence_emb, axis = 0).tolist()


  def end_computing_features(self):

    return self.colnames