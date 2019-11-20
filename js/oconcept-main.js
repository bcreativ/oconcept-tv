"use strict";

//Page load
$(window).on("load", function () {
    main();
});

async function main() {

    $(".loading").show();

    //Animate TV
    animateOldTv();

    animateWallArt();

    //Start preloading video
    addVideoChannels();

    runBarleyGirl();
}

async function animateWallArt() {

    var wallArtImages = new OConceptAnimateWallArt().Images;
    //Load data files
    for (var i = 0; i < wallArtImages.length; i++) {
        var wallArtImage = wallArtImages[i];
        //Get Image Data Points
        var url = "datafiles/wallart/" + wallArtImage.filename + ".json";
        if (checkUrl(url)) {
            //Load image data from files
            wallArtImage.data = await $.getJSON(url, { format: "json"}).catch((err) => { logMessage(err.message) });

            wallArtImage.data = shuffle(wallArtImage.data);

            logMessage("DATA FILE PATH PROCESSED : " + url + " Length: " + wallArtImage.data.length);
        }
    }

    //Animate images
    for (var i = 0; i < wallArtImages.length; i++) {

        var wallArtImage = wallArtImages[i];
        var imagePath = "images/wallart/" + wallArtImage.filename + ".png";

        var art = new OConceptAnimate(
            wallArtImage.filename,
            ["wallartcanvas"],
            imagePath,
            null,
            "wallart",
            wallArtImage.data,
            500,
            "all",
            "toptobottom");

        await art.animateImage().catch((err) => console.log(err));

        await timeout(3000);

        //make continuous loop
        if (i == 19)
            i = 0;

    }
}


var TVDATA = [];
var TVPAINTED;
var TVENDEVENTSCOMPLETED = false;
async function animateOldTv() {
    return new Promise(async (resolve, reject) => {

        if(TVDATA.length == 0){

            var totalCompletedBytes = 0;
            var totalBytes = [];

            function getSum(arr){
                var total = 0;
                for(var i = 0; i < arr.length; i++){

                    total += arr[i];
                }
                return total;
            }

            //Fetch files to compile all data points for animation
            var sourceFolder = "datafiles/oldtv/";
            var filePrefix = "oldtv-partial-";  
            var promises = [];
            for(var i= 0; i < 9;i++){
                var url = sourceFolder + filePrefix + i.toString() + ".json";
                
                var firstCall = true;
                if (checkUrl(url)) {
                    //Load image data from files
                     var promise = $.ajax({
                        dataType: "json",
                        url: url,
                        progress: function (e) {
                            if (e) {
                                if (e.lengthComputable) {
                                    //if first returned item FOR THIS PROMISE, insert
                                    if(!totalBytes[i])
                                        totalBytes.push(e.total);

                                    totalCompletedBytes += e.loaded;

                                    var completedPercentage = Math.round(totalCompletedBytes / getSum(totalBytes));
                                    $(".loading").text("Loading " + completedPercentage + "%");
                                }
                            }
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            logMessage(xhr.status + " " + xhr.responseText);
                            logMessage(thrownError);
                        }        
                    }); 
                    
                    promises.push(promise);
                }
            }
        
            await Promise.all(promises).then(values => { 
                for(var i = 0; i < values.length;i ++){
                    TVDATA = TVDATA.concat(values[i]);
                }
                logMessage("TV File successfully constructed. Length: " + TVDATA.length)
                $(".loading").hide();
            });;

            //Make request to fill tv reflection with user video
            await getUserVideo();

            await paintTV();

            resolve();
        }
    });
}
var TVCOUNTER = 0;
async function paintTV(){
    if(TVPAINTED != true){

        //Designate colors to stage for animation
        var stagedColors = await determineStagedColors();

        //get the number of currently painted tvs
        var numberOfPaintedElements = $(".oldtv").length;

        var tv = new OConceptAnimate(
            "oldtv",
            ["oldtv" + numberOfPaintedElements],
            "images/oldtvfull1.png",
            "images/oldtvnoscreen1.png",
            "oldtvcontainer",
            TVDATA,
            20000,
            "all",
            "righttolefttop",
            stagedColors);

        var animateVariables = await tv.animateImage();

        numberOfPaintedElements = $(".oldtv").length;
        //remove any extra painted items
        if(numberOfPaintedElements > 1)
            for(var i = 0; i < numberOfPaintedElements - 1; i++){
                if($($(".oldtv")[i]).attr("class")){
                    var number = parseInt($($(".oldtv")[i]).attr('class').split(" ")[0].replace("oldtv",""));
                    if(number < numberOfPaintedElements - 2)
                        $($(".oldtv")[i]).remove();
                }
            }

        //show channels
        TVPAINTED = true;

        if(!TVENDEVENTSCOMPLETED){
            $(".channelvideocontainer").show();

            //Show channel display after TV done
            $(".channeldisplay").show();

            //Show the remote
            $(".tvremotecontainer").show();

            registerEvents();
            
            TVENDEVENTSCOMPLETED = true;
        }
    }
}

window.onresize = function(){
    if(TVDATA.length == 0){
        paintTV();
    }
}

function determineStagedColors() {
    return new Promise(async (resolve, reject) => {
        var stagedColors = []
        var currentColor = {
            redLowerLimit: 0,
            redUpperLimit: 8,
            greenLowerLimit: 0,
            greenUpperLimit: 8,
            blueLowerLimit: 0,
            blueUpperLimit: 8
        }
        stagedColors.push(currentColor);

        var rounds = 255 % 20;
        for (var i = 0; i < rounds; i++) {
            if (currentColor.redUpperLimit + 21 < 255 &&
                currentColor.greenUpperLimit + 21 < 255 &&
                currentColor.blueUpperLimit + 21 < 255) {
                var colorRange = {
                    redLowerLimit: currentColor.redUpperLimit + 1,
                    redUpperLimit: currentColor.redUpperLimit + 21,
                    greenLowerLimit: currentColor.greenUpperLimit + 1,
                    greenUpperLimit: currentColor.greenUpperLimit + 21,
                    blueLowerLimit: currentColor.blueUpperLimit + 1,
                    blueUpperLimit: currentColor.blueUpperLimit + 21
                }
                stagedColors.push(colorRange);
                currentColor = colorRange;
            }
        }

        resolve(stagedColors);
    });

}

var currentChannel = null;

function addVideoChannels() {
    //get video channel container
    var videoContainer = $(".channelvideocontainer");

    //get channel object
    var channels = new OConceptChannelVideos();

    //set default current channel
    currentChannel = channels.Videos[0];

    //create video html elements for channels
    for (let index = 0; index < channels.Videos.length; index++) {
        const video = channels.Videos[index];

        //Concat class string
        var cssClassStr = "";
        for (let c = 0; c < video.cssClasses.length; c++) {
            cssClassStr += video.cssClasses[c] + " ";
        }

        var vidHtml = "<video id='" + video.videoName + "' class='" + cssClassStr.trim() + "'></video>";

        //Append video to DOM
        videoContainer.append(vidHtml);

        //Preload video for quick play
        preloadVideo(video.videoUrl, video.videoName, video.loop);
    }
}

function preloadVideo(vidUrl, videoName, videoLoop) {
    //get video element
    var video = document.getElementById(videoName);

    //Set all event handlers on video 
    setVideoEvents(videoName, video);

    //Preload video 
    fetch(vidUrl)
        .then(function (response) {
            response.blob().then(function (videoBlob) {
                var vid = URL.createObjectURL(videoBlob); // IE10+
                // Video is now downloaded
                // and we can set it as source on the video element
                video.src = vid;
                video.loop = videoLoop; //set looping 
            });

        })
        .catch(function (err) {
            logMessage("Error loading video : " + err.message);
        });

}

//Accesses user camera to show reflection on tv
async function getUserVideo() {

    return new Promise(async function(resolve, reject){
        
        var video = document.getElementById('usertvscreen');

        await activateUserVideoMessage();

        // Get access to the camera!
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

            // Not adding `{ audio: true }` since we only want video now
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(async function (stream) {

                    //handle user media message success
                    $(".accessstatus").text("Allowed!");

                    await timeout(3000);

                    $(".userMediaMessage").fadeOut(500);
                    PAUSECAMERAACCESSWAITING = true;
               
                    //show video
                    video.srcObject = stream;
                    video.play();
                    $(".usertvscreencontainer").show();

                    //hide placeholder
                    $(".oldtvscreen").hide();

                    resolve();                   
                })
                .catch(async (err) => {
                    logMessage("Access user camera : " + err.message);
                    //handle user media message blocked
    
                    $(".accessstatus").text("Blocked by user");
                    await timeout(3000);
                    PAUSECAMERAACCESSWAITING = true;
                    $(".userMediaMessage").fadeOut(500);
                    resolve();

                });
            }
    });
}

var PAUSECAMERAACCESSWAITING = false;
async function activateUserVideoMessage(){

    //check if camera has been approved already by the user
    var userHasCameraApproved = await checkIsCameraApproved();

    if(!userHasCameraApproved){

        //Explain to the user why we want camera access
        $(".userMediaMessage").show();

        var dot = 0;
        var dots = $(".accesswaiting > div");

        var i = 0;
        var colors = OConceptColors();
        var intervalId = setInterval(
            function(){

                if(!PAUSECAMERAACCESSWAITING){

                    var dotRef = $(dots[dot]);

                    //set background color
                    dotRef.css("color", colors[i]);

                    //set former dot white
                    if(dot == 0 && i == 0 ){
                        //first dot, do nothing
                    }
                    else if(dot == 0)
                        $(dots[dots.length - 1]).css("color", "white");
                    else
                        $(dots[dot-1]).css("color", "white");

                    //restart loop when done
                    if(i == colors.length - 1 )
                        i=0;
                    else
                        i++;
                    
                    //restart dots
                    if(dot == dots.length - 1)
                        dot = 0;
                    else
                        dot++;
                }
                else {
                    clearInterval(intervalId);
                }

        }, 200);
    }
}

function checkIsCameraApproved(){
    return navigator.mediaDevices.enumerateDevices()
      .then(infos =>
        // if any of the MediaDeviceInfo has a label, we're good to go
        [...infos].some(info=>info.label!=="")
      );
  }

var TVISON = false;
function goToNextChannel() {
    if (TVISON) {

        //Pause current channel
        var currentChannelVideo = $("#" + currentChannel.videoName);
        currentChannelVideo.trigger("pause");
        currentChannelVideo.hide();

        if (!($("#statictv").is(":visible")))
            showStatic();

        //Find next channel
        var channels = new OConceptChannelVideos().Videos;
        var nextChannel;
        var nextChannels = channels.filter(function (c) {
            return c.channelNumber == currentChannel.channelNumber + 1;
        })
        if (nextChannels.length > 0)
            nextChannel = nextChannels[0];
        else
            nextChannel = channels[0]; // if no next channel, go back to channel 00

        //Play next channel video
        if (nextChannel.channelNumber > 0) {
            var nextChannelVideo = $("#" + nextChannel.videoName);
            nextChannelVideo.trigger("play");
            nextChannelVideo.show();
            hideStatic();
        }

        //Set channel display to next channel
        $(".channeldisplay").text(nextChannel.channel);

        //Update current channel
        currentChannel = nextChannel;
    }

}

//contols the dog gif-esque animation
//just rotating images to keep transparent background
var PAUSEBARLEYGIRL;
async function runBarleyGirl(){
   
    if(!PAUSEBARLEYGIRL){

        $(".barleysmile").show();
        await timeout(2000);
        $(".barleysmile").hide();
        $(".barleymiddle").show();
        await timeout(500);
        $(".barleymiddle").hide();
        $(".barleytop").show();
        await timeout(500);
        $(".barleytop").hide();
        $(".barleymiddle").show();
        await timeout(500);
        $(".barleymiddle").hide();

        runBarleyGirl();
    }
}


function goToChannel(channelNumber) {

    if (TVISON) {

        //Find next channel
        var channels = new OConceptChannelVideos().Videos;
        var nextChannel;
        var nextChannels = channels.filter(function (c) {
            return c.channelNumber == channelNumber;
        })
        if (nextChannels.length > 0 && nextChannels[0].channelNumber != -1)
            nextChannel = nextChannels[0];
        else
            return false  // if no channel, don't do anything

        //Pause current channel
        var currentChannelVideo = $("#" + currentChannel.videoName);
        currentChannelVideo.trigger("pause");
        currentChannelVideo.hide();

        if (!($("#statictv").is(":visible")))
            showStatic();


        //Play next channel video
        if (nextChannel.channelNumber > 0) {
            var nextChannelVideo = $("#" + nextChannel.videoName);
            nextChannelVideo.trigger("play");
            nextChannelVideo.show();
            hideStatic();
        }
        //Set channel display to next channel
        $(".channeldisplay").text(nextChannel.channel);

        //Update current channel
        currentChannel = nextChannel;

        return true;
    }

}


function goToLastChannel() {

    if (TVISON) {

        //Pause current channel
        var currentChannelVideo = $("#" + currentChannel.videoName);
        currentChannelVideo.trigger("pause");
        currentChannelVideo.hide();

        if (!($("#statictv").is(":visible")))
            showStatic();

        //Find next channel
        var channels = new OConceptChannelVideos().Videos;
        var nextChannel;
        var nextChannels = channels.filter(function (c) {
            return c.channelNumber == currentChannel.channelNumber - 1;
        })
        if (nextChannels.length > 0 && nextChannels[0].channelNumber != -1)
            nextChannel = nextChannels[0];
        else
            nextChannel = channels[channels.length - 1]; // if no last channel, go back to top channel

        //Play next channel video
        if (nextChannel.channelNumber > 0) {
            var nextChannelVideo = $("#" + nextChannel.videoName);
            nextChannelVideo.trigger("play");
            nextChannelVideo.show();
            hideStatic();
        }
        //Set channel display to next channel
        $(".channeldisplay").text(nextChannel.channel);

        //Update current channel
        currentChannel = nextChannel;
    }

}

var channelUpdated = false;
function updateChannelSelection(num) {

    if (TVISON) {
        var channelDisplay = $(".channeldisplay").text();
        if (channelDisplay.length < 2) {
            var channelDisplay = $(".channeldisplay").text();
            $(".channeldisplay").text(channelDisplay + num.toString());
        }
        else
            $(".channeldisplay").text(num.toString());

        setTimeout(async function () {
            if (!channelUpdated) {
                channelDisplay = $(".channeldisplay").text();
                if (!goToChannel(parseInt(channelDisplay))) {
                    $(".channeldisplay").text("--");
                    await timeout(500);
                    $(".channeldisplay").text("");
                    await timeout(500);
                    $(".channeldisplay").text("--");
                    await timeout(500);
                    $(".channeldisplay").text("");
                    await timeout(500);
                    $(".channeldisplay").text(currentChannel.channel);
                    channelUpdated = true;              

                    setTimeout(async function () {
                        channelUpdated = false;
                    }, 1000)
                }
                else{ //if the channel is updated
                    updateMoreInfo()
                }

            }

        }, 3000);
    }
}

function updateMoreInfo(hide = false) {
    if (TVISON) {
        var url;

        if (currentChannel.channelNumber == 0 || hide) {
            $(".moreinfocontainer").hide();
            return;
        }

        //if wikipedia, get printable version to show to remove navigation, headers, etc
        if (currentChannel.videoClickType == "wikipedia") {
            var wikiTitle = currentChannel.videoClickUrl.substr(currentChannel.videoClickUrl.lastIndexOf("/") + 1);
            url = "https://en.wikipedia.org/w/index.php?title=" + wikiTitle + '&printable=yes';
        }
        else
            url = currentChannel.videoClickUrl;

        var iframe = document.getElementsByClassName("moreinfo")[0];
        iframe.src = url;
    }
}


function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function shuffle(array) {
    var m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {

        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}

var audio;
function registerEvents() {
    $("#buttononoff").on("click", function (e) {
        //Turn on from off mode
        if (!($("#statictv").is(":visible")) &&  //is static isnt showing
            !($(".channelvideo").is(":visible"))) { //and channel video isn't playing 

            TVISON = true; //set TV on flag 
            $("#TVTurningOn").show(); //show turning on video
            $(".oldtvscreen").css("opacity", ".2"); //keep reflection on tv, but increase transparancy
            //play turning on video clip
            document.getElementById("TVTurningOn").play().catch((err) => { logMessage(err.message) });
        }
        else { //Turn off
            updateMoreInfo(true); //close more info window if open
            TVISON = false; //set tv is off flag
            currentChannel = new OConceptChannelVideos().Videos[0];//reset current channel to 00
            $(".channelvideo").trigger("pause"); //pause current video
            $(".channelvideo").hide(); //hide current video
            $("#TVTurningOff").show(); //show turning off video
            hideStatic(); //hide static if showing
            //play turning off video clip
            document.getElementById("TVTurningOff").play().catch((err) => { logMessage(err.message) });
        }
    });

    //Channel up event
    $("#buttonchannelup").on("click", function (e) {
        goToNextChannel();
        updateMoreInfo();
    })

    //Channel down event
    $("#buttonchanneldown").on("click", function (e) {
        goToLastChannel();
        updateMoreInfo()
    })

    //Full screen event
    $("#buttonfullscreen").on("click", function (e) {
        if (TVISON) {
            if (currentChannel.channelNumber != 0)
                if ((window.fullScreen) ||
                    (window.innerWidth == screen.width && window.innerHeight == screen.height))
                    closeFullscreen();
                else {
                    var video = document.getElementById(currentChannel.videoName);
                    openFullscreen(video);
                }
        }
    })

    //More Info event 
    $("#buttonmoreinfo").on("click", function (e) {
        if (TVISON) {
            if (currentChannel.channelNumber != 0) {
                updateMoreInfo();
                if (!$(".moreinfocontainer").is(":visible"))
                    $(".moreinfocontainer").show();
                else
                    $(".moreinfocontainer").hide();
            }
        }
    });

    $("#buttonnumberone").on("click", function (e) {
        updateChannelSelection(1);
    });

    $("#buttonnumbertwo").on("click", function (e) {
        updateChannelSelection(2);
    });

    $("#buttonnumberthree").on("click", function (e) {
        updateChannelSelection(3);
    });

    $("#buttonnumberfour").on("click", function (e) {
        updateChannelSelection(4);
    });

    $("#buttonnumberfive").on("click", function (e) {
        updateChannelSelection(5);
    });

    $("#buttonnumbersix").on("click", function (e) {
        updateChannelSelection(6);
    });

    $("#buttonnumberseven").on("click", function (e) {
        updateChannelSelection(7);
    });

    $("#buttonnumbereight").on("click", function (e) {
        updateChannelSelection(8);
    });

    $("#buttonnumbernine").on("click", function (e) {
        updateChannelSelection(9);
    });

    var INVERTED = false;
    var PAUSEPSYCEDELIC = false;
    var backgroundImageCSSValue;
    $("#buttoninvert").on("click", function (e) {
        
        //invert
        //invertPage();

        //handle barley
        $(".barleycontainer").toggle();
        $(".barleyskeleton").toggle();
        if(!INVERTED){
           //show barley skeleton
            INVERTED = true;
            PAUSEBARLEYGIRL = true;
            PAUSEPSYCEDELIC = false;

            //psychedelic colors
            backgroundImageCSSValue = $(".main").css("background-image");
            $(".main").css("background-image", "none");

            var i = 0
            var colors = OConceptColors();
            var psychodelicIntervalId = setInterval(
                function(){

                    if(!PAUSEPSYCEDELIC){
                        //set background color
                        $(".main").css("background-color", colors[i]);
                        //restart loop when done
                        if(i == colors.length - 1 )
                            i=0;
                        else
                            i++;
                        }
                    else
                        clearInterval(psychodelicIntervalId)

            }, 200);

            //reset CAST scrolling credits animation
            $(".castcontainer").css("animation", "none");
            setTimeout(function(){
                $(".castcontainer").css("animation", "");
            }
            , 10);

            
    
        }
        else{
            //hide barley skeleton
            INVERTED = false;
            PAUSEBARLEYGIRL = false;
            PAUSEPSYCEDELIC = true;

            //stop colors
            clearInterval(psychodelicIntervalId);
            $(".main").css("background-color", "");
            $(".main").css("background-image", backgroundImageCSSValue);

            runBarleyGirl();        
        }

        //handles credits rolling
        $(".castcontainer").toggle();

    });

    $(".sound").on("click", function (e) {
        $(".sound > .yes").toggle();
        $(".sound > .no").toggle();

        if ($(".sound > .yes").is(":visible")) {
            audio = new Audio('audio/CleverSkipper.mp3');
            audio.loop = true;
            audio.play().catch((err) => logMessage(err.message));
        }
        else {
            audio.pause().catch((err) => logMessage(err.message));
        }
    });
}

function setVideoEvents(videoName, video) {
    //video clip tv turning on events
    if (videoName == "TVTurningOn") {
        video.onended = function (e) {
            $("#TVTurningOn").hide();
            showStatic();
            $(".channeldisplay").text("00");
            $("#usertvscreen").css("opacity", "1");
            $(".usertvscreencontainer").css("opacity", ".1");
        };
    }
    //video clip tv turning off events
    if (videoName == "TVTurningOff") {
        video.onended = function (e) {
            $("#TVTurningOff").hide();
            $(".channeldisplay").text("");
            $("#usertvscreen").css("opacity", ".1");
            $(".usertvscreencontainer").css("opacity", "1");

            if (!($("#usertvscreen").is(":visible"))) {
                $(".oldtvscreen").show();
                $(".oldtvscreen").css("opacity", "1");
            }
        };
    }

}

/* When the openFullscreen() function is executed, open the video in fullscreen.
Note that we must include prefixes for different browsers, as they don't support the requestFullscreen method yet */
function openFullscreen(elem) {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
    }
}

function closeFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { /* Firefox */
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE/Edge */
        document.msExitFullscreen();
    }
}
function showStatic(isFullScreen = false) {
    STATIC = true;
    //display static canvas to provide width
    $("#statictv").show();
    //turn on static
    startStatic(isFullScreen);

}

function hideStatic() {
    STATIC = false;
    window.onresize = null;
    $("#statictv").hide();
}

function checkUrl(url) {
    var http = $.ajax({
        type: "HEAD",
        url: url,
        async: false
    })
    return http.status == 200;
    // this will return 200 on success, and 0 or negative value on error
}

async function animatePhrase(phrase) {
    return new Promise(async (resolve, reject) => {
        var ocLetters = new OConnceptAnimateLetters();
        var phraseCharactersToAnimate = [];

        phrase = phrase.trim();
        var words = [];
        for (var i = 0; i < phrase.length; i++) {
            var c = phrase.charAt(i);
            if (c != " ") {
                var characterInfo = Object.create(ocLetters.Ryan.filter(function (l) { return l.character == c })[0]);
                console.log("START : " + characterInfo.character);

                characterInfo.containerClass = "word" + words.length.toString();

                //build path segment to paths related to this letter
                var pathSegment;
                if (characterInfo.type == "letter") {
                    if (characterInfo.case == "upper") {
                        pathSegment = "/letters" + ocLetters.RyanPath + "uppercase_" + characterInfo.character.toLowerCase();
                        characterInfo.fileNamePrefix = "uppercase_" + characterInfo.character.toLowerCase();
                    }
                    else {
                        pathSegment = "/letters" + ocLetters.RyanPath + characterInfo.character.toLowerCase();
                        characterInfo.fileNamePrefix = characterInfo.character.toLowerCase();
                    }
                }
                characterInfo.imageFilePath = "images" + pathSegment + ".png";
                characterInfo.preprocessedPath = "datafiles" + pathSegment + ".json";

                //check if preprocessed file exists, if so, use that data
                characterInfo.data = null;
                if (checkUrl(characterInfo.preprocessedPath)) {

                    //Load image data from files
                    characterInfo.data = await $.getJSON(characterInfo.preprocessedPath, { format: "json" });
                    //characterInfo.data = await new OConceptAnimate().convertFileDataToUsableImagePoints(data);
                    console.log("DATA FILE PATH PROCESSED : " + characterInfo.preprocessedPath + " Length: " + characterInfo.data.length);
                }

                phraseCharactersToAnimate.push(characterInfo);
            }
            else {
                words.push("word" + words.length.toString());
            }
        }

        words.push("word" + words.length.toString());
        //add containers for each word
        for (let i = 0; i < words.length; i++) {
            $(".canvascontainer").append("<div class='word " + words[i] + "'></div>");
        }

        for (var i = 0; i < phraseCharactersToAnimate.length; i++) {
            var characterToAnimate = phraseCharactersToAnimate[i];
            var letter = new OConceptAnimate(
                characterToAnimate.fileNamePrefix + i.toString(),
                ["letter", characterToAnimate.fileNamePrefix],
                characterToAnimate.imageFilePath,
                characterToAnimate.containerClass,
                characterToAnimate.data,
                10000,
                characterToAnimate.animateScanDirection,
                characterToAnimate.animateStartDirection);

            await letter.animateImage();
            console.log("FINISHED : " + characterToAnimate.character);
        }
        resolve();
    });
}

function logMessage(m) {
    console.log(m);
}

function invertPage() {
    // the css we are going to inject
    var css = 'html {-webkit-filter: invert(100%);' +
        '-moz-filter: invert(100%);' +
        '-o-filter: invert(100%);' +
        '-ms-filter: invert(100%); ' +
        'filter: invert(100%); ' +
        'filter: url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'invert\'><feColorMatrix in=\'SourceGraphic\' type=\'matrix\' values=\'-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0\'/></filter></svg>#invert"); }'
        ,

        head = document.getElementsByTagName('head')[0],
        style = document.createElement('style');

    // a hack, so you can "invert back" clicking the bookmarklet again
    if (!window.counter) { window.counter = 1; } else {
        window.counter++;
        if (window.counter % 2 == 0) { var css = 'html {-webkit-filter: invert(0%); -moz-filter:    invert(0%); -o-filter: invert(0%); -ms-filter: invert(0%); }' }
    };

    style.type = 'text/css';
    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    //injecting the css to the head
    head.appendChild(style);

}

//Avoid `console` errors in browsers that lack a console.
(function () {
    var method;
    var noop = function () { };
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());