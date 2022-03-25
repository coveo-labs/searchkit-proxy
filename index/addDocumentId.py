import json

newrecord=[]
with open('movies.json', "r",encoding='utf-8') as fh:
   text = fh.read()
   newrecord = json.loads(text)

for rec in newrecord:
  rec['DocumentId'] = 'https://movieimd/'+rec['imdbID']
  print (rec)
  print (rec['Director'])
  rec["posterOriginal"]=rec['Poster']
  if 'PosterS3' in rec:
    rec['Poster']=rec['PosterS3']
  # if rec['Director']:
  #   rec['Directors'] = rec['Director'].split(', ')
  # if rec['Actors']:
  #   rec['Actors'] = rec['Actors'].split(', ')
  # if rec['Writer']:
  #   rec['Writers'] = rec['Writer'].split(', ')
  # if rec['Country']:
  #   rec['Countries'] = rec['Country'].split(', ')
  #if rec['Genre']:
  #  rec['Genres'] = rec['Genre'].split(', ')

with open('movies_new.json', "w", encoding='utf-8') as handler:
        text = json.dumps(newrecord, ensure_ascii=True)
        handler.write(text)