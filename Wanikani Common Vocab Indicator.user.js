// ==UserScript==
// @name        Wanikani Common Vocab Indicator
// @namespace   dtwigs
// @author      dtwigs
// @description Show whether the vocabulary word is common or not according to Jisho.org
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/npm/store@2.0.12/dist/store.modern.min.js
// @include     https://www.wanikani.com/review/session
// @include     https://www.wanikani.com/lesson/session
// @version     0.0.4
// @grant       GM_xmlhttpRequest
// @connect     *
// ==/UserScript==


function init() {
  console.log('WK Common Vocab Indicator started');
  initUi();
  initJishoRepo();

  // Expose the clear cache function
  // To clear the cache use this command in your brower's developer tools console:
  // "window.commonVocabIndicator.clearCache()"
  var commonVocabIndicatorExports = unsafeWindow.commonVocabIndicator = {};
  commonVocabIndicatorExports.clearCache = function (){
    clearJishoCache();
    location.reload();
  }
}

//====================================================
//UI

var css = `
  .common-indicator-item {
    position: absolute;
    padding: 0px 5px 2px;
    top: 40px;
    right: 20px;
    -webkit-border-radius: 3px;
    -moz-border-radius: 3px;
    border-radius: 3px;
    z-index: 99;
    letter-spacing: 0;
    opacity: 0.8;
    text-decoration: none;
  }

  .common-indicator-item.hide {
    background-color: transparent;
    color: transparent;
  }

  .common-indicator-item.fetching {
    background-color: white;
    opacity: 0.4;
    color: #a100f1;
  }

  .common-indicator-item.common {
    background-color: white;
    color: #a100f1;
  }

  .common-indicator-item.uncommon {
    background-color: transparent;
    color: white;
    opacity: 0.5;
    visibility: hidden;
  }`;

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

function initUi() {
  //Add indicator UI
  addStyle(css);
  $('#question').append('<div id="common-indicator" class="common-indicator-item"></div>');
  $('#lessons').append('<div id="common-indicator" class="common-indicator-item"></div>');

  //Every time item changes, look up vocabulary from jisho.org
  var itemChangedEvent = function(key, callback){
    var currentItem = $.jStorage.get(key);

    // Check if item is not vocab
    if (!currentItem.hasOwnProperty('voc')) {
      setHideIndicator();
      return;
    }

    var vocab = currentItem.voc;
    fetchJishoData(vocab);
  };

  //Item Changed event
  $.jStorage.listenKeyChange('currentItem', itemChangedEvent);
  $.jStorage.listenKeyChange('l/currentLesson', itemChangedEvent);
}

function setCommonIndicator(isCommon) {
  if (isCommon) {
    setClassAndText(allClasses.common);
  } else {
    setClassAndText(allClasses.uncommon);
  }
}

function setFetchingIndicator() {
  setClassAndText(allClasses.fetching);
}

function setHideIndicator() {
  setClassAndText(allClasses.hide);
}

function setClassAndText(aObj) {
  var indicator = $('#common-indicator');
  for (var klass in allClasses) {
    indicator.removeClass(klass);
  }

  indicator.text(aObj.text).addClass(aObj.klass);
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
var cacheTtl = 1000 * 60 * 60 * 24 * 28;            //28 day cache expiry
var jishoCacher;

function initJishoRepo() {
  jishoCacher = new JishoCacher();
}

function fetchJishoData(vocab) {
  //Check the cache if we already have data
  var cacheValue = jishoCacher.get(vocab);
  if (cacheValue != null) {
    setCommonIndicator(cacheValue);
    return;
  }

  //Cache miss, fetch from jisho
  setFetchingIndicator();
  GM_xmlhttpRequest({
    method: 'get',
    url: jishoApiUrl + vocab,
    responseType: 'json',
    onload: function (response) {
      //No jisho data
      if (response.response.data.length == 0){
        console.log('Vocab not found on Jisho, defaulting to is_common=false for: ' + vocab);
        var defaultCommon = false;
        setCommonIndicator(defaultCommon);
        saveInCache(vocab, defaultCommon);
        return;
      }

      //Has jisho data, use is_common
      var isCommon = response.response.data[0].is_common;
      saveInCache(vocab, isCommon);
      setCommonIndicator(isCommon);
    },
    onerror: function (error) {
      console.error('Jisho error: ', error);
    },
    ontimeout: function(error) {
      console.error('Jisho timeout error: ', error);
    }
  });
}

function saveInCache(key, value) {
  jishoCacher.set(key, value, cacheTtl);
}

function clearJishoCache() {
  jishoCacher.clearAll();
  console.log("Jisho Common indicator cache cleared.")
}

//====================================================
//Cacher

class JishoCacher{
  //Namespace for the local storage
  namespaceKey = 'jishoIsCommonCache-';

  constructor(){
    //Check if we can use Store.js
    if (!store.enabled) {
      console.log("Failed to load Store.js because it is being runned on a non-modern browser.");
    }
  }
  set(key, val, exp) {
    //expiry time is in milliseconds
    var storeKey = this.namespaceKey + key;
    store.set(storeKey, { val: val, exp: exp, time: new Date().getTime() })
  }
  get(key) {
    var storeKey = this.namespaceKey + key;
    var info = store.get(storeKey)
    if (!info) { return null }
    if (new Date().getTime() - info.time > info.exp) { return null }
    return info.val
  }
  clearAll() {
    store.clearAll();
  }
}

//====================================================
init();
