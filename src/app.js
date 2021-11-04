const express = require("express");
const ccData = require("./cc-api");
const cryptor = require("./cryptor")
const userHandler = require("./user.js");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require('express-session');
const passportLocalMongoose = require("passport-local-mongoose");
const PriorityQueue = require('priorityqueuejs');

require('dotenv').config();

// -------------------------------- begin init --------------------------------

const app = express();

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

let hostedMongo = "mongodb+srv://feanor:" + process.env.DBKEY + "@cluster0.icwho.mongodb.net/ccDB2";

mongoose.connect(hostedMongo, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
});


const userSchema = new mongoose.Schema({
    username: String,
    password: String,
});

const coinSchema = new mongoose.Schema({
    buffer: String,
    coinMap: Object
})

userSchema.plugin(passportLocalMongoose);

const CoinSchema = new mongoose.model("usercoin", coinSchema);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var allCoinz = new Map();
var userTradePairs = new Map();
var usdTradePoolBuy = new Map();
var usdTradePoolSell = new Map();

function tradeItem(trader, coinID, price, amount, type) {
    this.trader = trader;
    this.coinID = coinID;
    this.price = price;
    this.amount = amount;
    this.type = type;
}

ccData.getAllCoinData(allCoinz);

// --------------------------------- end init ---------------------------------

app.get('/traderOrders/:id', (req, res) => {

    let orders = [];

    if (userTradePairs.has(req.params.id)) {
        userTradePairs.get(req.params.id).forEach((elem) => {
            orders.push(elem);
        });
    }

    res.render('orders', {
        orders: orders
    });
});

app.get('/buyOrders/:coin', (req, res) => {

    let orders = []

    if (usdTradePoolBuy.has(req.params.coin)) {
        usdTradePoolBuy.get(req.params.coin).forEach((elem) => {
            orders.push(elem);
        });
    }

    res.render('orders', {
        orders: orders
    });
});

app.get('/sellOrders/:coin', (req, res) => {

    let orders = []
    if (usdTradePoolSell.has(req.params.coin)) {
        usdTradePoolSell.get(req.params.coin).forEach((elem) => {
            orders.push(elem);
        })
    }

    orders = orders.reverse();

    res.render('orders', {
        orders: orders
    });
});

app.get('/orders/:coin', (req, res) => {

    let orders = []
    if (usdTradePoolSell.has(req.params.coin)) {
        usdTradePoolSell.get(req.params.coin).forEach((elem) => {
            orders.push(elem);
        })
    }

    orders = orders.reverse();

    if (usdTradePoolBuy.has(req.params.coin)) {
        usdTradePoolBuy.get(req.params.coin).forEach((elem) => {
            orders.push(elem);
        })
    }

    res.render('orders', {
        orders: orders
    });
});

app.post('/buy', async (req, res) => {
    let choice = req.body.reqTypeBuy;
    let coin = req.body.coinName;
    let amount = parseFloat(req.body.amount);
    let limitPrice = choice == 'limit' ? req.body.limitPrice : allCoinz.get(coin).price;
    let totalPrice = amount * limitPrice;

    userHandler.fetchUserCoinMap(CoinSchema, req.user.username, allCoinz, async (userCoinMap) => {

        if (userCoinMap.get(allCoinz.get('tether')).amount >= totalPrice && amount > 0) {
            if (choice == 'limit') {

                // decrease tether amount from user's balance, currently orders are unreversable
                await userHandler.updateCoinAmountAsyncWrapped(CoinSchema, amount * limitPrice, 'tether', req.user.username, 0);

                // try to deplete the buy limit
                while (amount > 0 && usdTradePoolSell.has(coin) && !usdTradePoolSell.get(coin).isEmpty() && parseFloat(usdTradePoolSell.get(coin).peek().price) <= parseFloat(limitPrice)) {

                    let sellItem = usdTradePoolSell.get(coin).peek();
                    let boughtAmount = amount > sellItem.amount ? sellItem.amount : amount;

                    if (amount >= sellItem.amount) {
                        usdTradePoolSell.get(coin).deq();
                    } else {
                        sellItem.amount -= amount;
                    }

                    await userHandler.updateCoinAmountAsyncWrapped(CoinSchema, boughtAmount * sellItem.price, 'tether', sellItem.trader, 1);
                    await userHandler.updateCoinAmountAsyncWrapped(CoinSchema, boughtAmount, coin, req.user.username, sellItem.price);
                    amount -= boughtAmount;
                }

                // limit buy wasn't depleted
                if (amount > 0) {
                    item = new tradeItem(req.user.username, coin, limitPrice, amount, "buy");

                    // prepare the map
                    if (!usdTradePoolBuy.has(coin)) {
                        let prioQueue = new PriorityQueue((a, b) => {
                            return a.price - b.price;
                        })
                        usdTradePoolBuy.set(coin, prioQueue);
                    }

                    if (!userTradePairs.has(req.user.username)) {
                        let userPairList = [];
                        userTradePairs.set(req.user.username, userPairList);
                    }

                    userTradePairs.get(req.user.username).push(item);
                    usdTradePoolBuy.get(coin).enq(item);

                }

                res.redirect('/app');

            } else {
                userHandler.updateCoinAmount(CoinSchema, amount, coin, null, req.user.username, allCoinz.get(coin).price, () => {
                    userHandler.updateCoinAmount(CoinSchema, -totalPrice, 'tether', null, req.user.username, 0, () => {
                        res.redirect("/app");
                    });
                });
            }
        } else {
            res.redirect('/app');
        }
    });

})

app.post('/sell', async (req, res) => {
    let choice = req.body.reqTypeSell;
    let coin = req.body.coinName;
    let amount = parseFloat(req.body.amount);
    let limitPrice = choice == 'limit' ? req.body.limitPrice : allCoinz.get(coin).price;
    let totalPrice = amount * limitPrice;

    userHandler.fetchUserCoinMap(CoinSchema, req.user.username, allCoinz, async (userCoinMap) => {

        if (userCoinMap.get(allCoinz.get(coin)) && amount > 0 && userCoinMap.get(allCoinz.get(coin)).amount >= amount) {
            if (choice == 'limit') {

                await userHandler.updateCoinAmountAsyncWrapped(CoinSchema, amount, coin, req.user.username, 0);

                while (amount > 0 && usdTradePoolBuy.has(coin) && !usdTradePoolBuy.get(coin).isEmpty() && parseFloat(usdTradePoolBuy.get(coin).peek().price) >= parseFloat(limitPrice)) {
                    let buyItem = usdTradePoolBuy.get(coin).peek();
                    let soldAmount = amount > buyItem.amount ? buyItem.amount : amount;

                    if (amount >= buyItem.amount) {
                        usdTradePoolBuy.get(coin).deq();
                    } else {
                        buyItem.amount -= amount;
                    }
                    await userHandler.updateCoinAmountAsyncWrapped(CoinSchema, soldAmount * buyItem.price, 'tether', req.user.username, 1);
                    await userHandler.updateCoinAmountAsyncWrapped(CoinSchema, soldAmount, coin, buyItem.trader, buyItem.price);
                    amount -= soldAmount;
                }

                if (amount > 0) {


                    let item = new tradeItem(req.user.username, coin, limitPrice, amount, "sell");


                    if (!usdTradePoolSell.has(coin)) {
                        let prioQueue = new PriorityQueue((a, b) => {
                            return b.price - a.price;
                        })
                        usdTradePoolSell.set(coin, prioQueue);
                    }

                    if (!userTradePairs.has(req.user.username)) {
                        let userPairList = [];
                        userTradePairs.set(req.user.username, userPairList);
                    }

                    userTradePairs.get(req.user.username).push(item);
                    usdTradePoolSell.get(coin).enq(item);
                    
                }

                res.redirect('/app');

            } else {
                userHandler.updateCoinAmount(CoinSchema, -amount, coin, null, req.user.username, 0, () => {
                    userHandler.updateCoinAmount(CoinSchema, totalPrice, 'tether', null, req.user.username, 1, () => {
                        res.redirect("/app");
                    });
                });
            }
        } else {
            res.redirect('/app');
        }
    });
});

app.get("/", (req, res) => req.isAuthenticated() ? res.redirect("/app") : res.render("home"));
app.get("/login", (req, res) => req.isAuthenticated() ? res.redirect("/app") : res.render("login"));
app.get("/register", (req, res) => req.isAuthenticated() ? res.redirect("/app") : res.render("register"));
app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/")
});
app.post("/login", passport.authenticate("local", {
    successRedirect: "/app",
    failureRedirect: "/"
}));

app.post("/register", (req, res) => {
    User.register({
        username: req.body.username
    }, req.body.password, (err, user) => {
        if (err) {
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, () => {
                map = new Map();
                ecd = cryptor.encrypt(JSON.stringify([...map.entries()]));
                CoinSchema.create({
                    buffer: req.user.username,
                    coinMap: ecd
                });
                res.redirect("/app");
            });
        }
    });
});

app.get("/app", (req, res) => {

    if (!req.isAuthenticated()) {
        res.redirect("/");
    } else {
        userHandler.fetchUserCoinMap(CoinSchema, req.user.username, allCoinz, (userCoinMap) => {
            ccData.updatePrices(userCoinMap, () => {
                res.render("portfolio", {
                    coinz: userCoinMap,
                    allCoinz: allCoinz,
                    totalWorth: userHandler.totalWorth(userCoinMap),
                    totalGainz: userHandler.totalGainz(userCoinMap)
                });
            });
        });

    }
});

app.post("/add", async (req, res) => {

    if (req.isAuthenticated()) {
        let id = req.body.coinName;
        let amnt = parseFloat(req.body.coinAmount);
        let userID = req.user.username;

        if (!id || !amnt || amnt <= 0) {
            res.redirect("/app");
        } else {
            await userHandler.updateCoinAmountAsyncWrapped(CoinSchema, amnt, id, userID, allCoinz.get(id).price);
            res.redirect("/app");
        }
    } else {
        res.redirect("/");
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server started.");
});