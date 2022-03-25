import requests
import marshal
import math
import json
from urllib import parse
import urllib


headers={    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9,nl;q=0.8,de;q=0.7",
    "authorization": "ApiKey NWF4c2VYOEJzRDhHMzlEX1JDejU6YnJXaS1XWjlSZ2F5ek1Cc3V4aXV6dw==",
    "content-type": "application/json",
    "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"99\", \"Google Chrome\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "Referer": "http://localhost:3000/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}
body = json.loads("{\"aggs\":{\"facet_bucket_all\":{\"aggs\":{\"countries\":{\"terms\":{\"field\":\"countries.keyword\",\"size\":5}},\"directors\":{\"terms\":{\"field\":\"directors.keyword\",\"size\":5}},\"writers\":{\"terms\":{\"field\":\"writers.keyword\",\"size\":5}}},\"filter\":{\"bool\":{\"must\":[{\"bool\":{\"should\":[{\"term\":{\"type\":\"series\"}}]}}]}}},\"facet_bucket_type\":{\"aggs\":{\"type\":{\"terms\":{\"field\":\"type\",\"size\":5}}},\"filter\":{\"bool\":{\"must\":[]}}},\"facet_bucket_metascore\":{\"aggs\":{\"metascore\":{\"histogram\":{\"field\":\"metascore\",\"interval\":5,\"min_doc_count\":0,\"extended_bounds\":{\"min\":0,\"max\":100}}}},\"filter\":{\"bool\":{\"must\":[{\"bool\":{\"should\":[{\"term\":{\"type\":\"series\"}}]}}]}}},\"facet_bucket_released\":{\"aggs\":{},\"filter\":{\"bool\":{\"must\":[{\"bool\":{\"should\":[{\"term\":{\"type\":\"series\"}}]}}]}}},\"facet_bucket_genres\":{\"aggs\":{\"genres\":{\"terms\":{\"field\":\"genres.keyword\",\"size\":5}}},\"filter\":{\"bool\":{\"must\":[{\"bool\":{\"should\":[{\"term\":{\"type\":\"series\"}}]}}]}}},\"facet_bucket_rated\":{\"aggs\":{\"rated\":{\"terms\":{\"field\":\"rated\",\"size\":5}}},\"filter\":{\"bool\":{\"must\":[{\"bool\":{\"should\":[{\"term\":{\"type\":\"series\"}}]}}]}}},\"facet_bucket_actors\":{\"aggs\":{\"actors\":{\"terms\":{\"field\":\"actors.keyword\",\"size\":5}}},\"filter\":{\"bool\":{\"must\":[{\"bool\":{\"should\":[{\"term\":{\"type\":\"series\"}}]}}]}}},\"facet_bucket_imdbrating\":{\"aggs\":{\"imdbrating\":{\"histogram\":{\"field\":\"imdbrating\",\"interval\":1,\"min_doc_count\":0,\"extended_bounds\":{\"min\":1,\"max\":10}}}},\"filter\":{\"bool\":{\"must\":[{\"bool\":{\"should\":[{\"term\":{\"type\":\"series\"}}]}}]}}}},\"size\":10,\"query\":{\"bool\":{\"should\":[{\"multi_match\":{\"query\":\"sherlock holmes\",\"fields\":[\"title\",\"genres\",\"directors\",\"writers\",\"actors\",\"countries\",\"plot\"],\"type\":\"best_fields\",\"operator\":\"and\"}},{\"multi_match\":{\"query\":\"sherlock holmes\",\"fields\":[\"title\",\"genres\",\"directors\",\"writers\",\"actors\",\"countries\",\"plot\"],\"type\":\"cross_fields\"}},{\"multi_match\":{\"query\":\"sherlock holmes\",\"fields\":[\"title\",\"genres\",\"directors\",\"writers\",\"actors\",\"countries\",\"plot\"],\"type\":\"phrase\"}},{\"multi_match\":{\"query\":\"sherlock holmes\",\"fields\":[\"title\",\"genres\",\"directors\",\"writers\",\"actors\",\"countries\",\"plot\"],\"type\":\"phrase_prefix\"}}]}},\"post_filter\":{\"bool\":{\"must\":[{\"bool\":{\"should\":[{\"term\":{\"type\":\"series\"}}]}}]}},\"from\":0,\"sort\":[{\"_score\":\"desc\"}]}")
r = requests.post('https://commerce-demo.es.us-east4.gcp.elastic-cloud.com:9243/imdb_movies/_search/',data=json.dumps(body),headers=headers)
print (r)
