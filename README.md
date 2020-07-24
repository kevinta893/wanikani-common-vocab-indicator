# wanikani-common-vocab-indicator

Userscript for TamperMonkey. Use with Wanikani.com during reviews and lessons. 

A "fork" of https://community.wanikani.com/t/new-user-script-common-vocabulary-indicator/19692

Original Author: dtwigs

## Changes from original

1. Move indicator to the right side
2. Hide indicator it is not a common word
3. Add cacher to reduce calls to the Jisho Api

## Clearing the IsCommon cache

In Tampermonkey: 
1. Under the "Installed userscripts" settings menu, click on the Common Vocab script. You should see the editor and the code for this script
2. Then and go to the "Storage" tab, replace everything with ```{}```
3. Click on save and the cache should now be cleared

**Note:** the "Storage" tab will only show if you set Tampermonkey's config mode to "Advanced" in the general settings
