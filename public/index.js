
document.getElementById('add-button').addEventListener('click', function () {
    document.getElementById("control-div").classList.add("hidden");
    document.getElementById("add-form").classList.remove("hidden");
    document.getElementsByClassName("table")[0].classList.add("hidden");

})

document.getElementById("close-add-form").addEventListener("click", function() {
    document.getElementById("control-div").classList.remove("hidden");
    document.getElementById("add-form").classList.add("hidden");
    document.getElementsByClassName("table")[0].classList.remove("hidden");
}) 


document.getElementById('buy-button').addEventListener('click', function () {
    document.getElementById("control-div").classList.add("hidden");
    document.getElementById("buy-form").classList.remove("hidden");
    document.getElementsByClassName("table")[0].classList.add("hidden");

})

document.getElementById("close-buy-form").addEventListener("click", function() {
    document.getElementById("control-div").classList.remove("hidden");
    document.getElementById("buy-form").classList.add("hidden");
    document.getElementsByClassName("table")[0].classList.remove("hidden");
}) 


document.getElementById('sell-button').addEventListener('click', function () {
    document.getElementById("control-div").classList.add("hidden");
    document.getElementById("sell-form").classList.remove("hidden");
    document.getElementsByClassName("table")[0].classList.add("hidden");

})

document.getElementById("close-sell-form").addEventListener("click", function() {
    document.getElementById("control-div").classList.remove("hidden");
    document.getElementById("sell-form").classList.add("hidden");
    document.getElementsByClassName("table")[0].classList.remove("hidden");
}) 


let radios = document.querySelectorAll('input[name="reqTypeBuy"]');
radios.forEach(radio => radio.addEventListener('change', () => {
    if (radio.value == 'limit') {
        document.querySelector('#limitPriceBuy').classList.remove("hidden");
    } else {
        document.querySelector('#limitPriceBuy').classList.add("hidden");
    }
}));


let radios2 = document.querySelectorAll('input[name="reqTypeSell"]');
radios2.forEach(radio => radio.addEventListener('change', () => {
    if (radio.value == 'limit') {
        document.querySelector('#limitPriceSell').classList.remove("hidden");
    } else {
        document.querySelector('#limitPriceSell').classList.add("hidden");
    }
}));