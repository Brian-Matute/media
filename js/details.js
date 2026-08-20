const params = new URLSearchParams(window.location.search);

const id = params.get("id");


fetch("data/media.json")

.then(response => response.json())

.then(media => {


    const item = media.find(movie => movie.id === id);


    const container = document.getElementById("details");


    container.innerHTML = `


    <div class="detail-card">


        <img 
        src="images/posters/${item.poster}" 
        alt="${item.title} poster"
        >



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

            <h3>
           📅 Date Watched
            </h3>

           <p>
           ${item.dateWatched || "Not added yet"}
           </p>


            <h3>
            Genre
            </h3>

            <p>
            ${item.genre || "N/A"}
            </p>
            
            ${item.type === "Show" ? `

           <h3>
           📺 Progress
           </h3>

           <p>
           ${item.progress || "Not added yet"}
           </p>

           ` : ""}



            <h3>
            Director / Creator
            </h3>

            <p>
            ${item.director || "N/A"}
            </p>




            <h3>
            My Thoughts
            </h3>


            <p>
            ${item.review}
            </p>

          <h3>
          Rotten Tomatoes/ IMDB:
          </h3>

          <p>

          <a 
          href="${item.rottenTomatoes || item.imdb}" 
         target="_blank">

         View Critic's Page

         </a>

         </p>


           




        </div>


    </div>


    `;


})


.catch(error => {

console.error("DETAIL PAGE ERROR:", error);

});