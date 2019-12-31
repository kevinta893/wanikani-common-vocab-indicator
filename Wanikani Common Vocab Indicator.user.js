// ==UserScript==
// @name        Wanikani Common Vocab Indicator
// @namespace   dtwigs
// @author      dtwigs
// @description Show whether the vocabulary word is common or not according to Jisho.org
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/npm/store@2.0.12/dist/store.modern.min.js
// @include     *://www.wanikani.com/review/session*
// @include     *://www.wanikani.com/lesson/session*
// @version     0.0.4
// @run-at      document-end
// @grant       GM_xmlhttpRequest
// @connect     *
// ==/UserScript==


function init(){
  console.log('WK Common Vocab Indicator started');
  initUi();
  initJishoRepo();
}

//====================================================
//UI

var css = 
    '.common-indicator-item {' +
    '    position: absolute;' +
    '    padding: 0px 5px 2px;' +
    '    top: 40px;' +
    '    right: 20px;' +
    '    -webkit-border-radius: 3px;' +
    '    -moz-border-radius: 3px;' +
    '    border-radius: 3px;' +
    '    z-index: 100;' +
    '    letter-spacing: 0;' +
    '    opacity: 0.8;' +
    '    text-decoration: none;' +
    '}' +
    '.common-indicator-item.hide {' +
    '    background-color: transparent;' +
    '    color: transparent;' +
    '}' +
    '.common-indicator-item.fetching {' +
    '    background-color: white;' +
    '    opacity: 0.4;' +
    '    color: #a100f1;' +
    '}' +
    '.common-indicator-item.common {' +
    '    background-color: white;' +
    '    color: #a100f1;' +
    '}' +
    '.common-indicator-item.uncommon {' +
    '    background-color: transparent;' +
    '    color: white;' +
    '    opacity: 0.5;' +
    '    visibility: hidden;' +
    '}';

var allClasses = {
  hide: {
    klass: 'hide',
    text: '',
  },
  fetching: {
    klass: 'fetching',
    text: '...',
  },
  common: {
    klass: 'common',
    text: 'common'
  },
  uncommon: {
    klass: 'uncommon',
    text: 'not common',
  }
};

function initUi(){
  addStyle(css);

  $('#question').append('<div id="common-indicator" class="common-indicator-item"></div>');
  $('#lessons').append('<div id="common-indicator" class="common-indicator-item"></div>');

  //every time item changes, look up vocabulary from jisho.org
  $.jStorage.listenKeyChange('currentItem', function(){
     var currentItem = $.jStorage.get('currentItem');
     var vocab = currentItem.voc;

     // Check if item is not vocab
     if (currentItem.on || currentItem.kun) {
      setHideIndicator();
      return;
     }

     fetchJishoData(vocab);
  });

  $.jStorage.listenKeyChange('l/currentLesson', function(){
    var currentLesson = $.jStorage.get('l/currentLesson');
    var vocab = currentLesson.voc;

    // Check if item is not vocab
     if (currentLesson.on || currentLesson.kun) {
      setHideIndicator();
      return;
     }

     fetchJishoData(vocab);
  });
}

function setCommonIndicator(isCommon) {
  if (isCommon) {
    setClassAndText(allClasses.common);
  } else {
    setClassAndText(allClasses.uncommon);
  }
}

function setFetchingIndicator(){
  setClassAndText(allClasses.fetching);
}

function setHideIndicator(){
  setClassAndText(allClasses.hide);
}

function setClassAndText(aObj) {
  var $wrapper = $('#common-indicator');
  for (var klass in allClasses) {
    $wrapper.removeClass(klass);
  }

  $wrapper.text(aObj.text).addClass(aObj.klass);
}

function addStyle(aCss) {
  var head, style;
  head = document.getElementsByTagName('head')[0];
  if (head) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.textContent = aCss;
    head.appendChild(style);
    return style;
  }
  return null;
}

//====================================================
// Jisho repository

var jishoApiUrl = "http://jisho.org/api/v1/search/words?keyword=";
var jishoSearchUrl = "http://jisho.org/search/";
var cacheTtl = 1000 * 60 * 60 * 24 * 21;            //21 days cache expiry
var jishoCacher;

function initJishoRepo(){
  //Check if we can use Store.js
  if (!store.enabled){
    console.log("Failed to load Store.js because it is being runned on a non-modern browser.");
  }

  //Configure store.js to expire values
  var storeWithExpiration = {
    set: function(key, val, exp) {
      //expiry time is in milliseconds
      store.set(key, { val:val, exp:exp, time:new Date().getTime() })
    },
    get: function(key) {
      var info = store.get(key)
      if (!info) { return null }
      if (new Date().getTime() - info.time > info.exp) { return null }
      return info.val
    },
    clearAll: function(){
      store.clearAll();
    }
  }

  //Setup cache
  jishoCacher = storeWithExpiration;
}

function fetchJishoData(vocab) {
  //Check the cache if we already have data
  var cacheValue = jishoCacher.get(vocab);
  if (cacheValue != null){
    setCommonIndicator(cacheValue);
    return;
  }

  //Cache miss, fetch from jisho
  setFetchingIndicator();
  GM_xmlhttpRequest({
      method: 'get',
      url: jishoApiUrl + vocab,
      responseType: 'json',
      onload: function(response) {
        var isCommon = response.response.data[0].is_common;
        saveInCache(vocab, isCommon);
        setCommonIndicator(isCommon);
      },
      onerror: function(error){
          console.log('Jisho error: ', error);
      }
  });
}

function saveInCache(key, value){
  jishoCacher.set(key, value, cacheTtl);
}

function clearCache(){
  jishoCacher.clearAll();
}

//====================================================
init();
