let allMedia = [];


const container = document.getElementById("media-grid");

const searchBar = document.getElementById("searchBar");

const typeFilter = document.getElementById("typeFilter");

const sortFilter = document.getElementById("sortFilter");



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

const selectedSort = sortFilter.value;


if(selectedSort === "titleAZ") {

    filteredMedia.sort((a,b) =>
        a.title.localeCompare(b.title)
    );

}


if(selectedSort === "titleZA") {

    filteredMedia.sort((a,b) =>
        b.title.localeCompare(a.title)
    );

}



if(selectedSort === "ratingHigh") {

    filteredMedia.sort((a,b) =>
        Number(b.rating) - Number(a.rating)
    );

}



if(selectedSort === "ratingLow") {

    filteredMedia.sort((a,b) =>
        Number(a.rating) - Number(b.rating)
    );

}



if(selectedSort === "yearNew") {

    filteredMedia.sort((a,b) =>
        Number(b.year) - Number(a.year)
    );

}



if(selectedSort === "yearOld") {

    filteredMedia.sort((a,b) =>
        Number(a.year) - Number(b.year)
    );

}



if(selectedSort === "tier") {


const tierOrder = {

"S":1,

"A":2,

"B":3,

"C":4,

"D":5,

"F":6

};


filteredMedia.sort((a,b) =>

tierOrder[a.tier] - tierOrder[b.tier]

);


}



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

sortFilter.addEventListener(
"change",
filterMedia
);