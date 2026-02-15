/**
 * Radio Browser integration script
 * Handles station search and management for radio-browser.info
 */

let thissearch = "";
let offset = 0;
let retrycount = 0;

async function search_clicked(){
    offset = 0;
    thissearch = document.getElementById("search-term").value;
    console.log(thissearch);
    render_stationList();
}

async function fwd_clicked(){
    offset += 12;
    console.log("new: " + offset);
    render_stationList()
}

async function bwd_clicked(){
    if( offset != 0){
        offset -= 12;
    }
    console.log("new: " + offset);
    render_stationList()
}

function search_on_enter(event) {
    // Check if the pressed key is Enter (key code 13)
    if (event.keyCode === 13) {
        // Call your function here
        search_clicked();
    }
}

/**Function from radio-browser.info/examples/serverlist-browser.js
* Ask a specified server for a list of all other servers
*/
function get_radiobrowser_base_urls() {
    return new Promise((resolve, reject)=>{
        var request = new XMLHttpRequest()
        // If you need https, you have to use fixed servers, at best a list for this request
        request.open('GET', 'http://all.api.radio-browser.info/json/servers', true);
        request.onload = function() {
            if (request.status >= 200 && request.status < 300){
                var items = JSON.parse(request.responseText).map(x=>"https://" + x.name);
                resolve(items);
            }else{
                reject(request.statusText);
            }
        }
        request.send();
    });
}

/**Function from radio-browser.info/examples/serverlist-browser.js
 * Get a random available radio-browser server.
 * Returns: string - base url for radio-browser api
 */
function get_radiobrowser_base_url_random() {
    return get_radiobrowser_base_urls().then(hosts => {
        var item = hosts[Math.floor(Math.random() * hosts.length)];
        return item;
    });
}

async function save_baseurl_in_sessionstorage(){
    try {
        const baseURL = await get_radiobrowser_base_url_random();
        sessionStorage.setItem('base_url', baseURL);
    } catch(error) {
        console.error('failed to set base URL in sessionStorage', error);
    }
}

save_baseurl_in_sessionstorage();

async function build_url(term){
    let rate = document.getElementById("rbs-bitrate").value;
    let type = document.getElementById("rbs-type").value;
    let codec = document.getElementById("rbs-codec").value;
    try {
        url = sessionStorage.getItem('base_url');
        //url = 'https://de1.api.radio-browser.info';
        if(url){
            url += '/json/stations/search?hidebroken=true';
            url += '&offset=' + offset;
            url += '&limit=12';
            url += '&' + type + '=' + term;
            if (rate) {
                url += '&bitrateMin=' + rate;
            }
            if (codec) {
                url += '&codec=' + codec;
            }
            url += '&order=clickcount&reverse=true';
            console.log('URL, built: ' + url);
            return url;
        }else{
            console.error("URL is undefined.");
            return null;
        }
    } catch(error) {
        console.error("Error getting base URL:", error);
        return null;
    }
}

async function render_stationList(){
    try {
        const url = await build_url(thissearch);
        if( url ){
            //const encodedUrl = encodedURIComponent(url);
            //console.log("encoded: ", encodedUrl);
            $.getJSON(url, function(data){
            
            var output = '';
            if( data.length !== 0 ){
                retrycount = 0;
                for( i=0; i < data.length; i++){
                var favicon = '';
                if (data[i].favicon !== ""){
                    favicon = data[i].favicon;
                } else {
                    favicon = 'https://www.radio-browser.info/favicon.ico';
                }
                output += '<li id="rs-' + (i+1) + '">';
                output += '<div class="db-icon db-song db-browse db-action">';
                output += '<a class="btn" href="#notarget" data-toggle="context" data-target="#context-menu-radio-browser">';
                output += '<i class="fas db-browse db-browse-icon" style="content:url(';
                output += favicon;
                output += '"></i></a></div>';
                output += '<div class="db-entry db-song db-browse" data-toggle="context" data-target="#context-menu-radio-browser" style="color:var(--textvariant)">';
                output += '<span class="rs-name" style="display:inline;color:var(--themetext)">' + data[i].name + '</span>';
                output += ' [<span class="rs-codec" style="display:inline">' + data[i].codec + '</span>';
                output += ' | <span class="rs-bitrate" style="display:inline">' + data[i].bitrate +
                '</span>kbps]<br>';
                output += '<span class="rs-country" style="display:inline">' + data[i].countrycode + '</span>';
                output += ' | <span class="rs-genre" style="display:inline">' + data[i].tags + '</span>';
                output += '<span class="rs-logo" style="display:none">' + favicon + '</span>';
                output += '<span class=rs-stream" style="display:none">' + data[i].url + '</span>';
                output += '</div></li>';

                }
            } else {
                if (retrycount < 3){
                
                retrycount++;
                offset = 0;
                render_stationList();

                } else {
                    console.log("Max retries reached");
                }
            }

            var outputContainer = document.getElementById('stations-list');
            outputContainer.innerHTML = output;
            })
            .done(function(){})
            .fail(function(jqXHR, textStatus, errorThrown){
                console.error("Error:", textStatus, errorThrown);
                console.error("Response:", jqXHR.responseText);
            });
        }
    } catch (error) {
        console.error("Error building URL", error);
    }
}

function clicky(){
    console.log('button clicked!');
    console.log(UI.dbEntry[0]);
}

let contextMenuSourceElement = null;

// save clicked list item and highlight by adding the active class
$(document).on('click.context', '#stations-list li', function(e) {
    contextMenuSourceElement = $(this);
    $('#stations-list li.active').removeClass('active');
    // Add active class to clicked li and store reference
    $(this).addClass('active');
});
// remove active class from list item
$(document).on('click', function(e) {
    if (!$(e.target).closest('#stations-list li, #context-menu-radio-browser').length) {
        $('#stations-list li.active').removeClass('active');
        contextMenuSourceElement = null;
    }
});

$(document).on('click.context.data-api', '#context-menu-radio-browser a', function(e) {
    e.preventDefault();
    const cmd = $(this).data('cmd');
    const stationElement = contextMenuSourceElement;
    const stationData = {
        name: stationElement.find('span.rs-name').text(),
        codec: stationElement.find('span.rs-codec').text(),
        bitrate: stationElement.find('span.rs-bitrate').text(),
        country: stationElement.find('span.rs-country').text(),
        genre: stationElement.find('span.rs-genre').text(),
        logo: stationElement.find('span.rs-logo').text(),
        stream: stationElement.find('span.rs-stream').text()
    };
    console.log(cmd);
    console.log(stationElement);
    console.log('Name: ', stationData.name);
    
    // Get the station data from your rendered list
    // You'll need to store the station data globally or in the DOM
    
    switch(cmd) {
        case 'station2db':
            console.log('Adding to database:', stationData.name);
            // Your custom functionality here
            handleAddToDatabase(stationData);
            break;
        case 'station2fav':
            console.log('Adding to favorites:', stationData.name);
            // Your custom functionality here
            handleAddToFavorites(stationData);
            break;
        case 'station2play':
            console.log('Play now: ', stationData.name);
            handlePlayNow(stationData);
            break;
        default:
            console.log('Unknown command:', cmd);
    }
});

// Custom handler functions
function handleAddToDatabase(stationData) {
    notify('Add station...', 'player_info', stationData.name,  2)
    // Example: send data to server
    /*$.get('command/playlist.php?cmd=add_item_to_database&index=' + stationIndex, function() {
        notify('added_to_database');
    });*/
}

function handleAddToFavorites(stationData) {
    notify('Add station to favorites...', 'player_info', stationData.name,  2)
    // Example: send data to server
    /*$.get('command/playlist.php?cmd=add_item_to_favorites&index=' + stationIndex, function() {
        notify('favorite_added');
    });*/
}

function handlePlayNow(stationData) {
    notify('Play station now...', 'player_info', stationData.name,  2)
}
