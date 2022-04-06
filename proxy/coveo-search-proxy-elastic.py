#Coveo search proxy elastic
#input: elastic query
#output: coveo results transformed into a elastic response

import copy
import sys
import requests
import marshal
import math
import json
from urllib import parse
import urllib
import re

def createURL(api_key,region):
  base_url=''
  if (not region==''):
    base_url='https://platform-'+region+'.cloud.coveo.com'
  else:
    base_url='https://platform.cloud.coveo.com'
  return base_url

def createAnalyticsURL(api_key,region):
  base_url=''
  if (not region==''):
    base_url='https://search-'+region+'.cloud.coveo.com'
  else:
    base_url='https://search.cloud.coveo.com'
  return base_url+'/rest/ua/v15/analytics'

def callSearchAPI(api_key, par, region, url_parameters):
  print('callSearchAPI')
  base_url=createURL(api_key,region)
  base_url+='/rest/search/v2'+par+'?'+'access_token='+api_key+'&'+url_parameters
  print('Calling:')
  print(base_url)
  r = requests.get(f'{base_url}')
  print (r)
  p = r.json()
  #print (p)
  return p

#Process Query Suggestion request
def processQS(api_key, region, url):
  print(f'processQS')
  output_parameters={}
  #default parameters
  output_parameters['count']=15
  output_parameters['searchHub']='AppSearch'
  output_parameters['referrer']='https://coveoproxy_qs/'
  input_parameters = [{ 'from': 'query', 'to':'q'}]
  for input_par in input_parameters:
    par = parse.parse_qs(parse.urlsplit(url).query)[input_par['from']][0]
    if par:
      output_parameters[input_par['to']]=par
  #we have everything ready now
  response = callSearchAPI(api_key, '/querySuggest', region, urllib.parse.urlencode(output_parameters,quote_via=urllib.parse.quote))
  returnValue=[]
  for qs in response['completions']:
    returnValue.append(''+qs['expression']+'')
  return returnValue

  
def sentSearchRequest(api_key, region, param):
  trackResponse={}
  trackResponse["actionCause"]="searchBoxSubmit"
  trackResponse["language"]="en"
  trackResponse["actionType"]="search box"
  trackResponse["originLevel1"]="AppSearch"
  trackResponse["responseTime"]=param["duration"]
  trackResponse["searchQueryUid"]=param["searchUid"]
  trackResponse["queryText"]=param["query"]
  trackResponse["resultsPerPage"]=param["limit"]
  trackResponse["pageNumber"]=param["page"]
  trackResponse["didYouMean"]="true"
  trackResponse["contextual"]="false"
  trackResponse["queryPipeline"]=param["pipeline"]
  trackResponse["numberOfResults"]=param["totalCount"]
  orgId = param["org"]
  base_url=createAnalyticsURL(api_key,region)
  if ('visitor' in param):
    base_url+='/search?org='+orgId+'&access_token='+api_key+'&visitor='+param["visitor"]+'&prioritizeVisitorParameter=true'
  else:
    base_url+='/search?org='+orgId+'&access_token='+api_key+'&prioritizeVisitorParameter=true'
  print('Calling Analytics API: '+base_url)
  jsonbody = json.dumps(trackResponse)
  print(jsonbody)
  headers = { "Content-Type":"application/json"}
  r = requests.post(f'{base_url}', data=jsonbody, headers=headers)
  print (r)
  return r.json()

def processFacetSelection(data):
  #get the aq for the facet selection
  # "post_filter": {
  #   "bool": {
  #     "must": [
  #       {
  #         "bool": {
  #           "should": [
  #             {
  #               "term": {
  #                 "type": "episode"
  #               }
  #             },
  #             {
  #               "term": {
  #                 "type": "series"
  #               }
  #             }
  #           ]
  #         }
  #       },
  #       {
  #         "bool": {
  #           "should": [
  #             {
  #               "term": {
  #                 "genres.keyword": "Drama"
  #               }
  #             }
  #           ]
  #         }
  #       },
  #       {
  #         "range": {
  #           "imdbrating": {
  #             "gte": 3,
  #             "lte": 10
  #           }
  #         }
  #       }
  #     ]
  #   }
  # },
  aq = ''
  if 'post_filter' in data:
    for main_filters in data['post_filter']['bool']['must']:
      for main_attribute, main_value in main_filters.items():
        if main_attribute=='bool':
          field = ''
          values = []
          #print (main_value)
          key = 'should'
          if 'must' in main_value:
            key = 'must'
          for filters in main_value[key]:
              for filter_attribute, filter_value in filters['term'].items():
                field = filter_attribute
                field = field.replace('.keyword','')
                values.append('"'+filter_value+'"')
          if values:
            aq+= ' (@'+field+'==('+','.join(values)+'))'
        if main_attribute=='range':
            for filter_attribute, filter_value in main_value.items():
                field = filter_attribute
                field = field.replace('.keyword','')
                aq+= ' (@'+field+'>='+str(filter_value['gte'])+' AND @'+field+'<='+str(filter_value['lte'])+')'
    print("AQ: "+aq)
  else:
    print("No Filter applied.")
  return aq

def cleanAdvanced(fieldname, current_aq):
  new_query=current_aq
  #remove the fieldname expression from the current_aq
  regexstr = '\(@[FIELD]([\w\W]+?)\)\)'.replace('[FIELD]',fieldname)
  regexstr = re.sub(regexstr,'',new_query)
  
  return regexstr

def processFacets(data, useGroupBy, current_query, current_aq):
  #special parsing for FACETS, requested
  # base entry: 'aggs'
  # transform to: 'facets'
  # "aggs": {
  #   "facet_bucket_all": {
  #     "aggs": {
  #       "countries": {
  #         "terms": {
  #           "field": "countries.keyword",
  #           "size": 5
  #         }
  #       },
  #       "directors": {
  #         "terms": {
  #           "field": "directors.keyword",
  #           "size": 5
  #         }
  #       },
  #       "writers": {
  #         "terms": {
  #           "field": "writers.keyword",
  #           "size": 5
  #         }
  #       }
  #     },
  # "facet_bucket_type": {
  #     "aggs": {
  #       "type": {
  #         "terms": {
  #           "field": "type",
  #           "size": 5
  #         }
  #       }
  #     },
  current_facets=[]
  #facet_template = '{"field": "[FIELD]",  "facetId": "[FIELD]", "type":"specific","preventAutoSelect": false,"delimitingCharacter": ">","isFieldExpanded": false,"filterFacetCount": true,"freezeCurrentValues": false, "injectionDepth":1000,"numberOfValues":8,"sortCriteria":"automatic","currentValues":[]}'
  facet_template = '{"delimitingCharacter":">","filterFacetCount":"true","injectionDepth":1000,"numberOfValues":8,"sortCriteria":"automatic","type":"specific","currentValues":[],"freezeCurrentValues":"false","isFieldExpanded":"false","preventAutoSelect":"false","facetSearch":{"numberOfValues":8},"field":"[FIELD]","facetId":"[FIELD]2"}'
  facet_template_groupby= '{"field":"@[FIELD]","maximumNumberOfValues":6,"sortCriteria":"score","injectionDepth":1000,"completeFacetWithStandardValues":"true","allowedValues":[]}'
  #facet_template_range = '{"facetId":"[FIELD]","field":"[FIELD]","type":"numericalRange","injectionDepth":1000,"filterFacetCount":"true","currentValues":[],"numberOfValues":8,"freezeCurrentValues":"false","generateAutomaticRanges":"true"}'
  #facet_template = '{"delimitingCharacter":">","filterFacetCount":"true","injectionDepth":1000,"numberOfValues":8,"sortCriteria":"automatic","type":"specific","freezeCurrentValues":"false","isFieldExpanded":"false","preventAutoSelect":"false","facetSearch":{"numberOfValues":8},"field":"[FIELD]","facetId":"[FIELD]2"}'
  #facet_template = '{field: "[FIELD]",  facetId: "[FIELD]", type:"specific", injectionDepth:1000,numberOfValues:8,currentValues:[]}'
  for attribute_main, value_main in data['aggs'].items():
     #print (attribute_main)
     #print (value_main)
     for attribute_facet, value_facet in value_main['aggs'].items():
       print("Adding Facet: "+attribute_facet)
       #print(value_facet)
       fieldname = attribute_facet
       if useGroupBy:
         facet = facet_template_groupby
       else:
        facet = facet_template
       facet = facet.replace('[FIELD]',fieldname)
       facetObject = json.loads(facet)

       if useGroupBy:
         if current_query:
          facetObject["queryOverride"] = current_query
         #if facet in current_aq
         if 'histogram' in value_facet:
           facetObject['advancedQueryOverride'] = current_aq
         else:
           facetObject['advancedQueryOverride'] = cleanAdvanced(fieldname, current_aq)

       #Check for ranges
       if 'histogram' in value_facet:
         facetObject['generateAutomaticRanges'] = "true"
         if useGroupBy:
           try:
            facetObject['sortCriteria']="nosort"
            facetObject['generateAutomaticRanges'] = "false"
            #calculate the proper ranges
            interval  = int(value_facet['histogram']['interval'])
            minRange = int(value_facet['histogram']['extended_bounds']['min'])
            maxRange = int(value_facet['histogram']['extended_bounds']['max'])
            steps = int((maxRange-minRange)/interval)
            ranges=[]
            curstep = minRange
            for x in range(0,steps):
                ranges.append({"start":curstep,"end":curstep+interval})
                curstep = curstep+interval
            facetObject["rangeValues"]=ranges
           except Exception as e: 
             print(e)
             continue
         if not useGroupBy:
          facetObject['type']='numericalRange'
          facetObject['rangeAlgorithm'] = "even"
         print("Added Numeric Range Facet")
       current_facets.append(facetObject)
  return current_facets

def processSort(data):
  #special parsing for SORT
  # # "sort": [
  #   {
  #     "_score": "desc"
  #   }
  # ]
  # #
  # base entry: 'sort'
  # transform to: 'sortCriteria'
  sort_check_score="_score"
  #if sort_check_score is there, use 'relevancy'
  #check if it is a date field
  sort_check_date_field="date"
  #Parse sort
  current_sort=''
  for sort in data['sort']:
    for attr, value in sort.items():
     #print (attr, value)
     if attr=='_score':
       #do nothing
       current_sort='relevancy'
       break 
     else:
       if attr==sort_check_score:
         #do nothing
         current_sort='relevancy'
         break
       else:
         if attr==sort_check_date_field:
           #use date sort
           if current_sort=='':
            current_sort='date '
           else:
             current_sort+= ', date'

         else:
           #it must be a field
           if current_sort=='':
             current_sort='@'+attr+' '
           else:
             current_sort+=', @'+attr+' '

         if value=='desc':
           current_sort+= ' descending'
         else:
           current_sort+= ' ascending'
  print("Sorting: "+current_sort)
  return current_sort

def createResponse(response, useGroupBy):
  returnValue = {}
  returnValue["took"]= response['duration']
  returnValue["timed_out"]= False
  returnValue["_shards"]={}
  returnValue["_shards"]["total"]=1
  returnValue["_shards"]["successful"]=1
  returnValue["_shards"]["skipped"]=0
  returnValue["_shards"]["failed"]=0
  returnValue["hits"]={}
  returnValue["hits"]["searchUid"]=response['searchUid']
  returnValue["hits"]["total"]={}
  returnValue["hits"]["total"]["value"]=response['totalCountFiltered']
  returnValue["hits"]["total"]["relation"]= "eq"
  results = response['results']
  max_score = 0
  for result in results:
     max_score=result['score']
     break
  returnValue["hits"]["max_score"] = max_score
  returnValue["hits"]["hits"]=[]
  #Create the results
  for result in results:
    rec = {}
    rec["_index"]=result['raw']['source']
    rec["_id"]= result['UniqueId']
    rec["_score"]= result['score']
    source = {}
    #put all the fields in the source
    source['id']=result['UniqueId']
    source['searchQueryUid']=response['searchUid']
    for attr, value in result['raw'].items():
        source[attr] = value
    rec["_source"] = source
    returnValue["hits"]["hits"].append(rec)

  #facets
  returnValue["aggregations"]={}
  #since we do not know if the facet should be in 'facet_bucket_all' --> we will add them all and also separate
  facet_bucket_all = {}
  all_facets={}
  #print (response['facets'])
  if useGroupBy:
    for facet in response['groupByResults']:
      facetvalue={}
      facettotal = 0
      facetvalues=[]
      if 'values' in facet:
        for value in facet["values"]:
          facettotal += value["numberOfResults"]
          facetcontent={}
          if 'value' in value:
            facetcontent["key"]= value["value"]
          if 'start' in value:
            facetcontent["key"]= value["start"]
          facetcontent["doc_count"]= value["numberOfResults"]
          facetvalues.append(facetcontent)
      facetvalue["doc_count"]=facettotal
      facetvalue[facet["field"]]={}
      facetvalue[facet["field"]]["buckets"]=facetvalues
      all_facets['facet_bucket_'+facet["field"]]=facetvalue
      facet_bucket_all[facet["field"]]={}
      facet_bucket_all[facet["field"]]["buckets"]=facetvalues
  else:
    for facet in response['facets']:
      facetvalue={}
      facettotal = 0
      facetvalues=[]
      if 'values' in facet:
        for value in facet["values"]:
          facettotal += value["numberOfResults"]
          facetcontent={}
          if 'value' in value:
            facetcontent["key"]= value["value"]
          if 'start' in value:
            facetcontent["key"]= value["start"]
          facetcontent["doc_count"]= value["numberOfResults"]
          facetvalues.append(facetcontent)
      facetvalue["doc_count"]=facettotal
      facetvalue[facet["field"]]={}
      facetvalue[facet["field"]]["buckets"]=facetvalues
      all_facets['facet_bucket_'+facet["field"]]=facetvalue
      facet_bucket_all[facet["field"]]={}
      facet_bucket_all[facet["field"]]["buckets"]=facetvalues

  all_facets['facet_bucket_all'] = facet_bucket_all
  returnValue["aggregations"] = all_facets
  
  return returnValue

def processQuery(api_key, region, data, org, partialmatch, sentSearchRequest, useGroupBy):
  print(f'processQuery')
  output_parameters={}
  #default parameters
  output_parameters['numberOfResults']=5
  output_parameters['searchHub']='ProxySearch'
  if partialmatch:
    output_parameters['partialMatch']=True
    output_parameters['partialMatchKeywords']=2

  output_parameters['referrer']='https://coveoproxyelastic/'
  input_parameters = [{'from':'size', 'to':'numberOfResults'},
                      #We do not have visitor info????
                      {'from':'visitor','to':'visitor'},
                       {'from':'analytics','to':'analytics'},
                      {'from':'from','to':'firstResult'}]
  #special parsing for QUERY
  # base entry: 'query'
  # transform to: 'q'
  #  "query": {
  #   "bool": {
  #     "should": [
  #       {
  #         "multi_match": {
  #           "query": "man",
  current_query=''
  try:
    current_query = data['query']['bool']['should'][0]['multi_match']['query']
  except:
    current_query = ''
  print ("Current query: "+current_query)

  #special parsing for FACETS, selected
  # base entry: 'post_filter'
  # transform to: 'aq'
  current_aq = processFacetSelection(data)

  # facets
  current_facets = processFacets(data, useGroupBy, current_query, current_aq)

  #Sort
  current_sort = processSort(data)

  #Normal input parameters
  for input_par in input_parameters:
    try:
      par = data[input_par['from']]
      if par:
        output_parameters[input_par['to']]=par
    except:
      #parameter is not there
      continue
  if current_query:
    output_parameters['q']=current_query
  if current_aq:
    output_parameters['aq']=current_aq
  if current_sort:
    output_parameters['sort']=current_sort
  if current_facets:
    if useGroupBy:
      output_parameters['groupBy']=json.dumps(current_facets)
    else:
      output_parameters['facets']=json.dumps(current_facets)
  #print (json.dumps(current_facets))
  #call api
  #print (output_parameters)
  response = callSearchAPI(api_key, '', region, urllib.parse.urlencode(output_parameters,quote_via=urllib.parse.quote))
  #sent it to Analytics
  if sentSearchRequest:
    response["query"]=current_query
    #currentpage
    currentpage = (data['from']/data['size'])+1
    response["page"]=int(currentpage)
    response["limit"]=data['size']
    response["org"]=org
    if 'visitor' in output_parameters:
      response["visitor"]=output_parameters["visitor"]
    if 'analytics' in output_parameters:
      if 'tag' in output_parameters["visitor"]:
        response["visitor"]=output_parameters["visitor"]["tag"][0]

    r=sentSearchRequest(api_key, region, response)
  #prep it for the response

  returnValue = createResponse(response, useGroupBy)

  return returnValue


def process(api_key, region, data, org, partialmatch, sentSearchRequest, useGroupBy ):
  returnValue=''
  returnValue=json.dumps(processQuery(api_key, region, data, org, partialmatch, sentSearchRequest, useGroupBy))
  return returnValue

def processFile(filename):
    settings = loadConfiguration()
    #print(f"qs: {json.dumps(event)}")
    api_key=settings['apikey']
    region=settings['region']
    org=settings['org']
    partialmatch=settings['partialmatch']
    sentSearchRequest=settings['sentsearchrequest']
    useGroupBy=settings['usegroupby']
    data={}
    with open(filename, "r",encoding='utf-8') as fh:
        text = fh.read()
        data = json.loads(text)
    output=(process(api_key,region,data, org, partialmatch, sentSearchRequest, useGroupBy))
    with open('OUT_'+filename, "w", encoding='utf-8') as handler:
        text = output
        handler.write(text)

def loadConfiguration():
  settings={}
  try:
      with open("settings.json", "r",encoding='utf-8') as fh:
        text = fh.read()
        settings = json.loads(text)
  except:
    print ("Failure, could not load settings.json or config.json")
  return settings

def lambda_handler(event, context):
    settings = loadConfiguration()
    #print(f"qs: {json.dumps(event)}")
    api_key=settings['apikey']
    region=settings['region']
    org=settings['org']
    partialmatch=settings['partialmatch']
    sentSearchRequest=settings['sentsearchrequest']
    useGroupBy=settings['usegroupby']
    #elastic uses the body to provide the details
    data = json.loads(event['body'])
    contentType='application/json'
    return {
          'statusCode': 200,
          'body': process(api_key,region,data, org, partialmatch, sentSearchRequest, useGroupBy),
          "headers": {
            "Content-Type": contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': "x-www-form-urlencoded, Origin, X-Requested-With, Content-Type, Accept, Authorization"
          }    
    }

#urlQS='http://content.atomz.com/autocomplete/sp10/05/6c/5e/?query=pa&callback=jQuery351012600085759917678'
#url='https://sp10056c5e.guided.ss-omtrdc.net/?count=5&page=7&do=json&q=adjustments&year=2020'

#processFile('elastic_3_in.json')
#processFile('elastic_in_facet.json')