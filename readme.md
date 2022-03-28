#Searchkit-proxy
Showcase on using a search proxy on a front-end to quickly enable a/b testing.

#Pre-Requisites
A front-end application. In this case we are using [searchkit](https://www.searchkit.co/).
This example is using an elastic index, so you need an elastic server.

A Coveo Platform instance. This will be used to query the Coveo indexes.

## Searchkit
The my-app was created with these [instructions](https://www.searchkit.co/docs/quick-start/basic-setup).

After copying the repo, use:
```cmd
npm install --legacy-peer-deps
```

## The Index
We are using the movie database provided [here](https://github.com/searchkit/searchkit/tree/next/examples/indexer).


## The Coveo Platform
Create a license and use the [Coveo Platform](https://platform.cloud.coveo.com/).

### Create the following fields

| Name | Type | Settings |
| --- | --- | ------ |
| type | String | Facet |
| rated | String | |
| released | Date | |
| genres | String | Multi value facet, Free Text search |
| directors | String | Multi value facet, Free Text search |
| writers | String | Multi value facet, Free Text search |
| actors | String | Multi value facet, Free Text search |
| countries | String | Multi value facet, Free Text search |
| plot | String | Free Text search |
| poster | String | |
| metascore | Integer 32 | |
| imdbrating | Decimal | |

### Create a Push source
Instructions [here](https://docs.coveo.com/en/94/).

Copy the API key created, for the next step.

### Push the contents
```cmd
pushapi index\movies.json
```

### Create Search API Key
To perform Search against the Coveo index, you need an API key for the communication.
In the Coveo Administration console, go in `Organization / API keys` and create a new API key for search, with these privileges:

- Under **Analytics**, set `Analytics Data` to _Push_
- Under **Analytics**, set `Impersonate` to _Allowed_
- Under **Search**, set `Execute Queries` to _Allowed_

#Proxy
A proxy will be created as AWS Lambda function. The Proxy will act as an Elastic Search index, but will query the Coveo Platform. The response will be formatted like Elastic is returning it. This proxy is written in Python.

The proxy needs to following information:
## Search API Key
See the 'Create Search API Key' procedure.
Put it in the `settings.json`, key `apikey`.

## Org id
Get the Org id of your Coveo Organization.
Put it in the `settings.json`, key `org`.

## Region
If you are not using the US datacenter of Coveo, you need to supply the region.
Region could be: `us`(default), `eu` or `apac`.
Put it in the `settings.json`, key `region`.

## Partial Match
Elastic search by default is using partial matching between keywords. Coveo does not. So in order to enable partial matching:
Put it in the `settings.json`, key `partialmatch` (true or false).

## GroupBy or Facet requests (for Coveo usage)
If you want to use DNE, you must use Facet Requests. But that has some limitations like pre-selected values are not available.
So by default we are now using groupBy requests:
Put it in the `settings.json`, key `usegroupby` (true or false).


## VisitorIds & Analytics
The searchkit communication towards Elastic does not enables us to include analytics information like a `VisitorId`.
We need to sent that seperately to Coveo, using the `CoveoUA.js` library.

If we are capable of submitting a `VisitorId` to the request:
Put it in the `settings.json`, key `sentsearchrequest` (true or false).

The response to the front end includes the `hits.searchUid` which contains the `searchUid` from the Coveo response.
You can use that in your subsequent Analytics calls.

If possible, you can send the following to the elastic endpoint:
```json
  {"analytics":
    { "tags":[visitorId]
    }
  }
```

### Deploy Proxy API on Amazon AWS
1. Copy `settings.json` and `coveo-search-proxy-elastic.py` to `pcak` directory.
2. Zip the contents of that directory.
3. Create a Lambda Function. Name it `CoveoElasticProxy`.
4. Use `Python 3.8` code.
5. Use the code from `PCAK\pcak.zip` directory.
6. Create a new `API Gateway`, `REST Service`.
7. Name it: `CoveoElasticProxy`.
8. Endpoint type: `Regional`.
9. Select `Actions`, `Create Resource`.
10. Select `Proxy Resource`.
11. Enable `API Gateway CORS`.
12. Hit `Create Resource`.
13. Integration Type: `Lambda Function`.
14. Select `CoveoSearchProxy`.
15. Select `Actions`, `Deploy API`.
16. Deployment Stage: New Stage.
17. Stage name: `Prod`.
18. Hit Deploy.
19. Copy the `invoke` url. And put it into your `my-app\src\App.js`.

### Deploy your my-app into a public URI hosted on AWS s3
Goto directory `src`
`npm run build`
`creates3.cmd` or `creates3.sh`

If you have updates to your app:
`updates3.cmd` or `updates3.sh`

