import  "./index.scss";

// testing  building
function getStringOfArray(array:string[]):string {
    return array.join("");
}
console.log(getStringOfArray(["1","2","3"]));


let div:HTMLDivElement = document.createElement('div');
document.body.append(div);