# wanikani-common-vocab-indicator

Userscript for TamperMonkey. Use with Wanikani.com during reviews and lessons. 


Original Script Author: *dtwigs*

A "fork" of [Common Vocabulary Indicator](https://community.wanikani.com/t/new-user-script-common-vocabulary-indicator/19692)

## Installation
[Install from GreasyFork](https://greasyfork.org/en/scripts/408339-wanikani-common-vocab-indicator)

## Changes from original

1. Move indicator to the right side
2. Hide indicator when it is not a common word
3. Add cache to reduce calls to the Jisho API

## Clearing the IsCommon cache

In Tampermonkey: 
1. Under the "Installed userscripts" settings menu, click on the Common Vocab script. You should see the editor and the code for this script
2. Then and go to the *Developer > Factory reset* . **Warning: this will clear any custom modifications you made to the script**
