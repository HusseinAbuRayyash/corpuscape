from pathlib import Path
from urllib.request import urlopen
import re,hashlib,json,datetime
base=Path(__file__).resolve().parents[2]/'corpus-qa';base.mkdir(exist_ok=True)
items=[('01-alice-en','Alice Adventures in Wonderland','Lewis Carroll','en','https://www.gutenberg.org/cache/epub/11/pg11.txt'),('02-pepita-es','Pepita Jimenez','Juan Valera','es','https://www.gutenberg.org/cache/epub/17223/pg17223.txt')]
records=[]
for ident,title,author,language,url in items:
    raw=urlopen(url,timeout=30).read();text=raw.decode('utf-8-sig').replace('\r\n','\n').replace('\r','\n')
    (base/(ident+'-original.txt')).write_bytes(raw)
    start=re.search(r'^\*\*\* START OF .+?\*\*\*\s*$',text,re.M)
    end=re.search(r'^\*\*\* END OF .+?\*\*\*\s*$',text,re.M)
    if not start or not end or end.start()<=start.end():raise RuntimeError('Gutenberg markers missing')
    body=text[start.end():end.start()].strip()
    (base/(ident+'.txt')).write_bytes(body.encode('utf-8'))
    records.append({'id':ident,'title':title,'author':author,'language':language,'source':url,'rights':'Project Gutenberg states public domain in the USA. Used locally for testing; original retained.','downloaded':datetime.date.today().isoformat(),'rawBytes':len(raw),'cleanedCharacters':len(body),'sha256':hashlib.sha256(body.encode()).hexdigest()})
(base/'sources.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(records,ensure_ascii=False))

