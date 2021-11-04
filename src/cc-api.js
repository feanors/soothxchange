const { kMaxLength } = require("buffer");
const https = require("https");

const urlAllCoins = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=7d";

function coinDefault(id, name, price, image) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.image = image;
}

exports.updatePrices = (userCoinMap, callback) => {

    queryStringForCoinIdList = ""
    for (const [key, value] of userCoinMap.entries()) {
        queryStringForCoinIdList += key.id + ',';  // the last comma here is not a problem
    }

    priceRequestURL = "https://api.coingecko.com/api/v3/simple/price?ids=" + queryStringForCoinIdList + "&vs_currencies=usd";
    requestParser(priceRequestURL, (parsedData) => {
        for (const [key, value] of userCoinMap.entries()) {
            key.price = parsedData[key.id].usd
        }

        callback();
    });
    
}

exports.getAllCoinData = (allCoinz) => { 

    requestParser(urlAllCoins, (parsedData) => {
        for (let i = 0; i < parsedData.length; i++) {

            let id = parsedData[i].id;
            let price = parsedData[i].current_price;
            let name = parsedData[i].name;
            let image = parsedData[i].image;
            allCoinz.set(id, new coinDefault(id, name, price, image));   
        }
    });    
}

function requestParser(url, callback) {
    let parsedData;
    https.get(url, (res) => {
    let body = "";
    
        res.on("data", (data) => {
            body += data;
        });
    
        res.on("end", () => {
            parsedData = JSON.parse(body);
            callback(parsedData);
        });        
    });
}


exports.getPriceOnDate = (id, date, callback) => {
    let currPriceURL = "https://api.coingecko.com/api/v3/coins/" + id + "/history?date=" + date + "&localization=false";
    requestParser(currPriceURL, (parsedData) => {
        if(parsedData.market_data) {
            callback(parsedData.market_data.current_price.usd);
        } else {
            callback(null)
        }
    });
}