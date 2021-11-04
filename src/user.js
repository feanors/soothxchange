const ccData = require("./cc-api");
const cryptor = require("./cryptor");

function coinPersonalized(amount, pricePaid) {
    this.amount = amount,
    this.pricePaid = pricePaid;
}

exports.fetchUserCoinMap = async function(CoinSchema, userID, allCoinz, callback) {
    CoinSchema.findOne({buffer: userID}, (err, resp) => {
        let userCoinMap = new Map();
        
        if(resp) {
            object = { iv: resp.coinMap.iv, content: resp.coinMap.content };
            map = new Map(JSON.parse(cryptor.decrypt( object )));
            for (const [key, value] of map.entries()) { 
                userCoinMap.set(allCoinz.get(key), value);
            }
        }    

        // userCoinMap = new Map([...userCoinMap.entries()].sort(function(a, b) { if(a[0] && b[0]) { b[0].price*b[1].amount - a[0].price*a[1].amount;}}));
        // need to fix this with undefined check, needed due to modified html input, will left unsorted for now

        callback(userCoinMap);
    });
}

exports.decreaseCoinByAmount = function(CoinSchema, map, amnt, id, auther, callback) {
    let coin = map.get(id);

    if(map.has(id)) { 
        coin.amount = coin.amount + amnt;
        if(coin.amount <= 0) {
            map.delete(id);
        }
    }

    ecd = cryptor.encrypt(JSON.stringify([...map.entries()]));
    CoinSchema.updateOne({buffer: auther}, {coinMap : ecd}, (err) => callback());
}

exports.decreaseCoinByAmountAsyncWrapped = async function(CoinSchema, map, amnt, id, auther) {
    let coin = map.get(id);

    if(map.has(id)) { 
        coin.amount = coin.amount + amnt;
        if(coin.amount <= 0) {
            map.delete(id);
        }
    }

    ecd = cryptor.encrypt(JSON.stringify([...map.entries()]));
    await CoinSchema.updateOne({buffer: auther}, {coinMap : ecd});
}

exports.increaseCoinByAmount = function(CoinSchema, map, amnt, id, priceOnDate, auther, callback) {
    let coin = map.get(id);

    if(map.has(id)) { 
        coin.pricePaid = ((coin.amount * coin.pricePaid) + (amnt * priceOnDate)) / (coin.amount + amnt);
        coin.amount = coin.amount + amnt;
    } else {
        map.set(id, new coinPersonalized(amnt, priceOnDate));
    }    

    ecd = cryptor.encrypt(JSON.stringify([...map.entries()]));
    CoinSchema.updateOne({buffer: auther}, {coinMap : ecd}, (err) => callback());
}

exports.increaseCoinByAmountAsyncWrapped = async function(CoinSchema, map, amnt, id, priceOnDate, auther) {
    let coin = map.get(id);

    if(map.has(id)) { 
        coin.pricePaid = ((coin.amount * coin.pricePaid) + (amnt * priceOnDate)) / (coin.amount + amnt);
        coin.amount = coin.amount + amnt;
    } else {
        map.set(id, new coinPersonalized(amnt, priceOnDate));
    }    

    ecd = cryptor.encrypt(JSON.stringify([...map.entries()]));
    await CoinSchema.updateOne({buffer: auther}, {coinMap : ecd});
}

exports.updateCoinAmountAsyncWrapped = async function(CoinSchema, amount, id, user, price) {
    let resp = await CoinSchema.findOne({ buffer: user });
    let map = new Map(JSON.parse(cryptor.decrypt(resp.coinMap)));
    if (price == 0) {
        return await exports.decreaseCoinByAmountAsyncWrapped(CoinSchema, map, -amount, id, user);
    } else {
        return await exports.increaseCoinByAmountAsyncWrapped(CoinSchema, map, amount, id, price, user);
    }
}

exports.updateCoinAmount = function(CoinSchema, amnt, id, date, auther, price=0, callback) {

    CoinSchema.findOne({buffer: auther}, (err, resp) => {

        if(resp) {
            let map = new Map(JSON.parse(cryptor.decrypt(resp.coinMap)));
            // why didn't i properly design this func first ... :(
            if(date == null && price == 0) {
                exports.decreaseCoinByAmount(CoinSchema, map, amnt, id, auther, callback);
            }else {
                if(price > 0) {
                    exports.increaseCoinByAmount(CoinSchema, map, amnt, id, price, auther, callback);
                } else {
                    ccData.getPriceOnDate(id, date, (priceOnDate) => {

                        if (priceOnDate != null) {
                            exports.increaseCoinByAmount(CoinSchema, map, amnt, id, priceOnDate, auther, callback);
                        } else {
                            callback();
                        }            
                    });
                }
                
            }  
        }
    });
}


exports.totalWorth = function (coinz) {

    let worth = 0;

    for (const [key, value] of coinz.entries()) {
        if(key)
            worth += key.price * value.amount;
    }

    return worth;
}

exports.totalGainz = function (coinz) {
    
    let spent = 0;
    
    for (const [key, value] of coinz.entries()) {
        if(key)
            spent += value.pricePaid * value.amount;
    }

    return exports.totalWorth(coinz) - spent;
}