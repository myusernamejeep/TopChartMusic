var youtube = require('youtube-feeds');
var Q = require('q');
var deferred = Q.defer();
var restify = require('restify');
var jsdom = require("jsdom");
var mongo = require('mongodb');
var fs = require('fs');
	
youtube.httpProtocol = 'https'
var zeed_index = []; 
var chart_url = "http://www.seedcave.com/index.php/listen/the-playlists/item/playlist-seed-chart-top-20-2013-11-03";

/*
var mongoskin = require('mongoskin');
var db = mongoskin.db('mongodb://localhost:27017/playlist-seed-chart-top-20?auto_reconnect', {safe:true});
app.use(function(req, res, next) {
  req.db = {};
  req.db.tasks = db.collection('2013-11-03');
  next();
})*/

/******************************************************************************
 * Database Setup
 *****************************************************************************/
var mongoCollectionName = '2013-11-03';
var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/playlist-seed-chart-top-20';
var database;
function connect(callback)
{
  var deferred = Q.defer();

  if(database === undefined)
  {
    mongo.Db.connect(mongoUri, function(err, db){
      if(err) deferred.reject({error: err});

      database = db;
      deferred.resolve();
    });
  }
  else
  {
    deferred.resolve();
  }

  return deferred.promise;
}

/* ---------------------------  function -------------------------------*/

/*
function getZeedIndex(){
	var zeed_index = [];
	getZeedList().then(function(zeed_list){
      	console.log(zeed_list);

		zeed_list.each(function (index,  query) {
		    searchYoutubeByViewCount( query ).then(function(search_result){
	      		zeed_index.push(search_result);
	    	});
		}).then(function(){

	      	deferred.resolve(zeed_index);
	      	//res.send(zeed_index);
	    });

    });

    return deferred.promise;
}*/

// qMap
var qMap = function(array, fn){
    
    var dfd = Q.defer();
    var index = 0;
    
    (function next(){
        var item = array[index];
        if(index >= array.length) {
            dfd.resolve();
            return;
        }
        
        index++;
        fn(item).then(next);
        
    })();
    
    return dfd.promise;
        
};
 
function getJsonZeedIndex(){
	/*
	var zeed_list = [ 'โปรดเถิดรัก – COCKTAIL',
  'คำถามซึ่งไร้คนตอบ – Getsunova',
  'เมียไม่มี – โจอี้ บอย',
  'เพลงส่วนบุคคล – fellow fellow',
  'No Money No Honey – น๊อต วรุฒม์',
  'อ้าว – The Richman Toy',
  'โดยไม่มีเธอ - ต้น ธนษิต',
  'ภูมิแพ้กรุงเทพ feat. ตั๊กแตน ชลดา – ป้าง นครินทร์',
  'วิธีใช้ feat. แสตมป์ – สิงโต นำโชค',
  'ถือว่าเราไม่เคยพบกัน feat. ตุล อพาร์ตเม้นต์คุณป้า – AB normal',
  'น้อย – วัชราวลี',
  'รุ้ง – Slot Machine',
  'พยายาม – O-PAVEE',
  'ให้ฉันทนเหงา ดีกว่าเขาไม่รักเธอ – คชา',
  'หยุดสงสาร – เบลล์ นันทิตา',
  'อ๊ะป่าว? (Yes it?) – The 38 Years Ago',
  'ไม่พูดก็ได้ยิน (Unspoken Word) – G-TWENTY',
  'ทำไมต้องทำให้มีน้ำตา – Better Weather',
  'ยิ่งเบื่อยิ่งรัก – TEN TO TWELVE',
  'หน้าสวยใจเสีย (เพลงประกอบละครทองเนื้อเก้า) – เต้น นรารักษ์' ];
	*/
	var deferred = Q.defer();
	
	// execute function list
	getZeedList().then(function(zeed_list){
		qMap(
		    zeed_list,
		    searchYoutubeByViewCountToZeedIndex )
		.then(function(xxx){
			//console.log( 'zeed_index', zeed_index , xxx);
		    deferred.resolve(zeed_index);
		});
	});
 
	return deferred.promise;
}

function searchYoutubeByViewCountToZeedIndex(query){
	var search_result = [];
	var deferred = Q.defer();
	youtube.feeds.videos({q: query, maxResults : 5, format : 6, order:'viewCount' }, function (err, results) {
 	  	var result;
	  	for (var i = 0; i < results.items.length ; i++) {
	  		result = results.items[i];
	  		var title = result.title.toLowerCase();
	  		if (title.indexOf('official mv') != -1 ||
	  			title.indexOf('official mv HD') != -1 ||
	  			title.indexOf('official music video') != -1 ||
	  			title.indexOf('official music video hd') != -1 || 
	  			title.indexOf('official audio') != -1 ){
	  			search_result.push({
	  				name: query,
	  				title: result.title,
	  				thumbnail: result.thumbnail.sqDefault,
	  				content : result.content,
	  				duration: result.duration,
					likeCount: result.likeCount,
 					viewCount: result.viewCount,
 					dateTime: new Date().getTime()
	  			});

	  			break;
	  		}
	  	};
 		zeed_index.push(search_result[0]);
	  	//console.log( search_result[0] );
	  	deferred.resolve(zeed_index);
	})

	return deferred.promise;
}

function getZeedIndexRespond(req, res, next) {
  	getJsonZeedIndex().then(function(search_result){

  		connect().then(function(){
  			database.collection(mongoCollectionName).remove();
  			database.collection(mongoCollectionName).save(search_result);
  			console.log("end database");
	    }).then(function(){
	    	console.log("wrteFile");
  			wrteFile(search_result,mongoCollectionName);
  		}).then(function(data){
			res.send(search_result);
		});
      	
    });
}

function wrteFile(data,mongoCollectionName){

	var deferred = Q.defer();
	var outputFilename =  __dirname + '/zeed_fixures/'+  mongoCollectionName + '.json';

	fs.writeFile(outputFilename, JSON.stringify(data, null, 4), function(err) {
	    if(err) {
	      console.log(err);
	      deferred.reject('Error: ' + err);
	    } else {
	      console.log("JSON saved to ");
	    }

	    deferred.resolve(data);
	}); 
 
	return deferred.promise;
}

function readFile(mongoCollectionName){
 
	var deferred = Q.defer();
	var file = __dirname + '/zeed_fixures/'+  mongoCollectionName + '.json' ;
 
	fs.readFile(file, 'utf8', function (err, data) {
	  if (err) {
	    console.log('Error: ' + err);
	    deferred.reject('Error: ' + err);
	  }
	 
	  data = JSON.parse(data);
	 
	  deferred.resolve(data);
	});

	return deferred.promise;
}

function getStaticData(mongoCollectionName){
	var mongoCollectionName = mongoCollectionName || '2013-11-03';
	var deferred = Q.defer();
	readFile(mongoCollectionName).then(function(data){
		connect().then(function(){
	       	database.collection(mongoCollectionName).save(data);
	        deferred.resolve(data);
	    });
 	});
	return deferred.promise;
}

function getStaticDataRespond(req, res, next) {
 	getStaticData().then(function(data){
 		res.send(data || {});
    });
}

function getSearch(req, res, next) {
  	console.log('search q = ' + req.params.query  );
  	var r = searchYoutubeByViewCount( req.params.query ).then(function(search_result){
      res.send(search_result);
    });
}
	  	
function searchYoutubeByViewCount(query){
	var search_result = [];
	var deferred = Q.defer();
	youtube.feeds.videos({q: query, maxResults : 5, format : 6, order:'viewCount' }, function (err, results) {
 	  	var result;
	  	for (var i = 0; i < results.items.length ; i++) {
	  		result = results.items[i];
	  
	  		var title = result.title.toLowerCase();
 
	  		if (title.indexOf('official mv') != -1 ||
	  			title.indexOf('official mv hd') != -1 ||
	  			title.indexOf('official music video') != -1 ||
	  			title.indexOf('official music video hd') != -1 || 
	  			title.indexOf('official audio') != -1 ){
	  			search_result.push({
	  				title: result.title,
	  				thumbnail: result.thumbnail.sqDefault,
	  				content : result.content,
	  				duration: result.duration,
					likeCount: result.likeCount,
 					viewCount: result.viewCount,
	  			});

	  			deferred.resolve(search_result);
	  		}
	  	};
  
	  	deferred.resolve(search_result);
	})

	return deferred.promise;
}

function getZeedList(){

	var deferred = Q.defer();
	var results = [];
	jsdom.env({
	  url: chart_url ,
	  scripts: ["http://code.jquery.com/jquery.js"],
	  done: function (errors, window) {
	    var $ = require('jquery').create(window);
		var plist = $('.element.element-textarea.last').find('p');
		var songs_names = plist.slice(4, 25);
 	    songs_names.each(function (index,  p) {
	    	var tag_p = $(p).html();
 	       	var tmp = tag_p.replace("<p>","").replace("</p>","");
			var no = tmp.substring(3,5);
			var search_text = tmp.substring(5).trim();

			results.push( search_text );
	    });
 

	    deferred.resolve(results);
	  }
	});

	return deferred.promise;
}

function getZeedListrespond(req, res, next) {
  res.send(getZeedList());
} 

function getZeedPlaylist(){
	
	var deferred = Q.defer();
	var base_url = "http://www.seedcave.com";
	var results = [];
	
	jsdom.env({
	  url: "http://www.seedcave.com/index.php/listen/the-playlists",
	  scripts: ["http://code.jquery.com/jquery.js"],
	  done: function (errors, window) {
	  	var $ = require('jquery').create(window);

	  	var alist = $('.element.element-image.element-imagepro.first.last').find('a');
	  	alist.each(function (index,  a) {
	      var _a    = $(a);
	      var href  = base_url + _a.attr('href');
	      var src   = base_url + _a.find('img').attr('src');
	      var title = _a.attr('title');
	      console.log(" href ", href, src , title);
	 
	      results.push({href:href, src:src, title:title});
	    });
	  
	  	deferred.resolve(results);
	  }
	});

	return deferred.promise;
}

function getZeedPlaylistRespond(req, res, next) {
	getZeedPlaylist().then(function(results){
      res.send(maxResults);
    }); 
} 

function getJsonPlaylist(href){
	var deferred = Q.defer();
	//var zeed_index = [];
	// execute function list
	zeed_index = [];
	getPlayList(href).then(function(zeed_list){
		qMap(
		    zeed_list,
		    searchYoutubeByViewCountToZeedIndex )
		.then(function(xxx){
			//console.log( 'zeed_index', zeed_index , xxx);
		    deferred.resolve(zeed_index);
		});
	});
 
	return deferred.promise;
}

function upDateAllPlayList(){
	
	var deferred = Q.defer();
	getZeedPlaylist().then(function(results){
		var href_list = [];
      	for(i=0; i< results.length ; i++){
	      	var href = results[i].href;
 	 		href_list.push(href);
  	  	}
 	  	qMap(
		    href_list,
		    getJsonPlaylist )
		.then(function(xxx){
 		    deferred.resolve(zeed_index);
		});
	 
    }); 

    return deferred.promise;
}

function upDateAllPlayListRespond(req, res, next) {
  	upDateAllPlayList().then(function(search_result){
		res.send(search_result || {});	
    });
}

function getPlayList(url){

	var deferred = Q.defer();
	var base_url = "http://www.seedcave.com";
	var results = [];
	jsdom.env({
	  url: url,
	  scripts: ["http://code.jquery.com/jquery.js"],
	  done: function (errors, window) {
	  	var $ = require('jquery').create(window);

	  	var plist = $('.FreeForm').find('span');
	  	plist = plist.splice(5);

	  	for(i=0; i< plist.length ; i++){
	      	var p = plist[i];
	      	var _p  = $(p).html().substring(3).trim();
	  
    	}
	    deferred.resolve(results);
	  }
	});

	return deferred.promise;
}
 
function getPlayListRespond(req, res, next) {
  	console.log('url q = ' + req.params.url  );
  	getPlayList(req.params.url).then(function(search_result){
      res.send(search_result);
    });
}
	  
var server = restify.createServer();
  
server.get('/search/:query', getSearch);
server.get('/getZeedPlaylist', getZeedPlaylistRespond); 
server.get('/getPlayList/:url', getPlayListRespond); 
server.get('/getZeedList', getZeedListrespond); 
server.get('/updateZeedIndex', getZeedIndexRespond); 
server.get('/zeedIndex', getStaticDataRespond); 

server.get('/upDateAllPlayList', upDateAllPlayListRespond); 


server.listen(3001, function() {
  console.log('%s listening at %s', server.name, server.url);
});

