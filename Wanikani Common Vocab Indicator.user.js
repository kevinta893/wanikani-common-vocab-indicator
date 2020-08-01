// ==UserScript==
// @name        Wanikani Common Vocab Indicator
// @namespace   kevinta893
// @author      kevinta893
// @description Show whether the vocabulary word is common or not according to Jisho.org
// @run-at      document-end
// @include     https://www.wanikani.com/review/session
// @include     https://www.wanikani.com/lesson/session
// @version     0.0.4
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @connect     *
// ==/UserScript==

// Original Script by dtwigs

function init() {
  initUi();
  initJishoRepo();
  console.log('WK Common Vocab Indicator started');

  // To clear the cache in Tampermonkey, 
  // use Developer > Factory Reset in the script editor
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

  //Item Changed event
  $.jStorage.listenKeyChange('currentItem', itemChangedEvent);
  $.jStorage.listenKeyChange('l/currentLesson', itemChangedEvent);
}

function itemChangedEvent(key, callback){
  var currentItem = $.jStorage.get(key);

  // Check if item is not vocab
  if (!currentItem.hasOwnProperty('voc')) {
    setHideIndicator();
    return;
  }

  var vocab = currentItem.voc;
  fetchJishoData(vocab);
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

var jishoApiUrl = "https://jisho.org/api/v1/search/words?keyword=";
var cacheTtlMillis = 1000 * 60 * 60 * 24 * 28;            //28 day cache expiry
var jishoCacher;

function initJishoRepo() {
  jishoCacher = new JishoCacher();
}

function fetchJishoData(requestedVocab) {
  //Check the cache if we already have data
  var cacheValue = jishoCacher.get(requestedVocab);
  if (cacheValue != null) {
    setCommonIndicator(cacheValue);
    return;
  }

  //Cache miss, fetch from jisho
  setFetchingIndicator();

  var successCallback = function(vocab, isCommon){
    //Unknown, assign default
    if (isCommon == null){
      var defaultCommon = false;
      console.log('Vocab not found, defaulting to is_common=false for: ' + vocab);
      setCommonIndicator(defaultCommon);
      saveInCache(vocab, defaultCommon);
      return;
    }

    //Has isCommon data
    saveInCache(vocab, isCommon);
    setCommonIndicator(isCommon);
  };

  getJishoIsCommon(requestedVocab, successCallback);
}

function saveInCache(key, value) {
  jishoCacher.set(key, value, cacheTtlMillis);
}

//====================================================
//Jisho API requester

/**
 * Determines if a vocab work is common or not using the Jisho API
 * @param {*} vocab The vocab to lookup the is_common data for
 * @param {*} successCallback The callback when the Jisho request is a success. 
 * Calls back with (string vocab, nullable<bool> isCommon). True if common, false otherwise. 
 * If no data (unknown word), then undefined is returned.
 */
function getJishoIsCommon(vocab, successCallback){
  GM_xmlhttpRequest({
    method: 'get',
    url: jishoApiUrl + vocab,
    responseType: 'json',
    onload: function (response) {
      //No jisho data
      if (response.response.data.length == 0){
        successCallback(vocab, null);
      }

      var isCommon = response.response.data[0].is_common;
      successCallback(vocab, isCommon);
    },
    onerror: function (error) {
      console.error('Jisho error: ', error);
    },
    ontimeout: function(error) {
      console.error('Jisho timeout error: ', error);
    }
  });
}

//====================================================
// Cacher

class JishoCacher{
  //Namespace for the local storage
  namespaceKey = 'jishoIsCommonCache';

  constructor(){ }

  set(key, val, expiryMillis) {
    //expiry time is in milliseconds
    var storageKey = this.generateStorageKey(key);
    GM_setValue(storageKey, { val: val, exp: expiryMillis, time: new Date().getTime() })
  }

  get(key) {
    var storageKey = this.generateStorageKey(key);
    var info = GM_getValue(storageKey);
    if (!info) {
      //Not cached
      return null;
    }
    if (new Date().getTime() - info.time > info.exp) { 
      //Cache expired
      return null;
    }
    //Cached value
    return info.val;
  }
  generateStorageKey(key){
    return `${this.namespaceKey}/${key}`;
  }
}

//====================================================
init();
