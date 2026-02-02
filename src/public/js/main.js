const h1Rand = document.getElementById("boxTitle");
const spanRand = document.getElementById("boxData");

async function getData(endpoint) {
    const response = await fetch(`http://10.85.12.57:5810/api/${endpoint}`);
    const data = await response.json();
    
    return data;
}

async function updateTelemetry() {
    const data = await getData('status');

    h1Rand.textContent = data.randomNumber.title;
    spanRand.textContent = data.randomNumber.data;
}

updateTelemetry();