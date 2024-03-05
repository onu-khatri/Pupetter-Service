# Puppeteer based API Service

This service is based on puppeteer, a headless Chrome Node API which is maintained by the Chrome DevTools team.
This service can use to render a web-page on server and perform action like web-page to pdf or snapshots etc.
Service have below implementations:


## How to run

Clone the repo and run these commands to install dependencies and build the package.
1. npm install
3. npm run server:start
4. Make post request with url to download the pdf of page.
5. API listen on https://localhost:3001

### Usage

API serves your POST requests and returns pdf of provided url.
Request will have JSON body like this.

```javascript
{
    "url":"Url_to_crawl",
    "pdfOptions":{
        "printBackground":true,
        "marginBottom":0
    },
    "pageOptions":{
        "maxWaitingTime": 120000,
        "waitForSelector": {
            "selector": "#wrapper-pdf-cover"
        }
    }
}
```

[PDF Options](https://github.com/puppeteer/puppeteer/blob/v19.2.2/docs/api/puppeteer.pdfoptions.md)
