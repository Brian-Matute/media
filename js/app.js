let allMedia = [];


const container = document.getElementById("media-grid");

const searchBar = document.getElementById("searchBar");

const typeFilter = document.getElementById("typeFilter");



fetch("data/media.json")


.then(response => response.json())


.then(media => {


    allMedia = media;


    displayMedia(allMedia);


})


.catch(error => {


console.error("JSON ERROR:", error);


});





function displayMedia(media) {


container.innerHTML = "";



media.forEach(item => {



const card = document.createElement("div");


card.classList.add("card");





card.innerHTML = `


<img src="images/posters/${item.poster}" 
alt="${item.title} poster">



<div class="card-info">


<h3>
${item.title}
</h3>


<p>
${item.year} • ${item.type}
</p>


<p>
⭐ ${item.rating}
</p>


<p>
🏆 ${item.tier} Tier
</p>



</div>


`;





card.onclick = function(){


window.location.href =
`details.html?id=${item.id}`;


};





container.appendChild(card);



});



}






function filterMedia(){



const searchTerm =
searchBar.value.toLowerCase();



const selectedType =
typeFilter.value;





const filteredMedia = allMedia.filter(item => {



const matchesSearch =

item.title
.toLowerCase()
.includes(searchTerm);





const matchesType =

selectedType === "all"

||

item.type === selectedType;





return matchesSearch && matchesType;



});





displayMedia(filteredMedia);



}





searchBar.addEventListener(
"input",
filterMedia
);



typeFilter.addEventListener(
"change",
filterMedia
);