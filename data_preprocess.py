import json

def generate_data(config_data_prefix, logger):

  all_config_keys = [key.lower() for key in list(logger.config_dict.keys()
    ) if config_data_prefix in key.lower()]

  folder_key  = [key for key in all_config_keys if "folder" in key][-1].upper()
  data_key    = [key for key in all_config_keys if "data" in key][-1].upper()
  targets_key = [key for key in all_config_keys if "targets" in key][-1].upper()

  data = []
  data_file = open(logger.get_data_file(logger.config_dict[data_key], 
    logger.config_dict[folder_key]), mode = "r", encoding = "utf8")
  for line in data_file:
    data.append(json.loads(line))
  data_file.close()

  targets = []
  targets_file = open(logger.get_data_file(logger.config_dict[targets_key], 
    logger.config_dict[folder_key]), mode = "r", encoding = "utf8")
  for line in targets_file:
    targets.append(json.loads(line))
  targets_file.close()

  dataset = []
  for element, target in zip(data, targets):
    dataset.append(element)
    dataset[-1]['clickBaitScore'] = target['truthMean']
  
  return dataset