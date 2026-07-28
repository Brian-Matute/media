let media = [];


fetch("data/media.json")

.then(response => response.json())

.then(data => {

media = data;

displayMedia(media);

});




function displayMedia(items){

const grid = document.getElementById("media-grid");

grid.innerHTML = "";


items.forEach(item => {


grid.innerHTML += `


<div class="card">


<img src="images/posters/${item.poster}">


<div class="content">


<h2>${item.title}</h2>


<h3>
${item.type} • ${item.year}
</h3>


<p>
⭐ ${item.rating}
</p>


<p>
🏆 Tier: ${item.tier}
</p>


<p>
${item.genre}
</p>


<p>
${item.review}
</p>


</div>


</div>


`;


});


}




document
.getElementById("search")
.addEventListener("input", filterMedia);



document
.getElementById("filter")
.addEventListener("change", filterMedia);




function filterMedia(){


let search =
document
.getElementById("search")
.value
.toLowerCase();



let category =
document
.getElementById("filter")
.value;



let results =
media.filter(item => {


let matchesSearch =
item.title
.toLowerCase()
.includes(search);



let matchesCategory = true;



if(category !== "All"){


matchesCategory =
item.type === category ||
item.tier === category ||
item.categories.includes(category);


}



return matchesSearch && matchesCategory;


});



displayMedia(results);


}