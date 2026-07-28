const params = new URLSearchParams(window.location.search);

const id = params.get("id");


fetch("data/media.json")

.then(response => response.json())

.then(media => {


const item = media.find(movie => movie.id === id);


const container = document.getElementById("details");


container.innerHTML = `


<div class="detail-card">


<img src="images/posters/${item.poster}">


<div class="detail-info">


<h1>${item.title}</h1>


<h3>
${item.year} • ${item.type}
</h3>


<h2>
⭐ ${item.rating}
</h2>


<h2>
🏆 ${item.tier} Tier
</h2>



<h3>My Thoughts</h3>

<p>
${item.review}
</p>



<h3>Favorite Scene</h3>

<p>
${item.favoriteScene}
</p>



<h3>Why It's Special</h3>

<p>
${item.whyItsSpecial}
</p>



<h3>Would I Rewatch?</h3>

<p>
${item.rewatch}
</p>



</div>


</div>


`;


});