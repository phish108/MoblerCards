I. INTRODUCTION
===============

The name of this software module is Mobler Cards. It is Mobile Web Application initially developed by the ISN, ETH Zürich and now maintained by Mobinaut.
Its purpose is to provide a Learning Cards experience on mobile phones for courses on a LMS.

II.FEATURES
============

- Full offline support
- Personal learning statistics
- Two way LMS Synchronisation
- Secure Authentication (no usernames and passwords transmitted over the Internet)
- Supported Question Types
    - Single Choice
    - Multiple Choice
    - Cloze [TODO]
    - Sort/Order [TODO]
    - Numbers [TODO]
- Automatic answer assessment and feedback
- Configurable additional feedback
- Learning badges [TODO]
- Multi course support
- Multi LMS support
    - Ilias LMS
    - Moodle LMS [TODO]
- Connects to any LMS that provides the appropriate services
- ADL XAPI Support
- IMS QTI Support [TODO]
- IMS LIP Support [TODO]
- LMS triggered language detection
- Translations
    - English
    - German
    - Greek
    - Romanian
    - Estonian

IV. GENERAL NOTES
=================


II.INSTALLATION
===============

End users want to install Mobler Cards from their favorite app store.

Developers require

- the latest version of cordova (http://cordova.apache.org)
- SDKs for the platforms they want to use (iOS and android are known to work)

To create custom builds follow these steps:

0. update cordova using npm -g install cordova
1. clone this repository
2. run cordova platform add [YOUR_PLATFORM_OF_CHOICE]
3. build the app using cordova build
4. deploy and test the app as usual


V.LICENSES
===========

Mobler Cards is released under the Apache License Version 2 (See LICENSE.md)


VI.ACKNOWLEGEMENTS
=================

Mobler Cards have been developed by
- Christian Glahn (Version 1-3)
- Evangelia Mitsopoulou (Version 1 + 2)
- Isabella Nake (Version 1)
- Dijan Helbling (Version 3)

The artwork and interface design has been provided by
- Tim Wendel

Icons were borrowed and extended via icomoon

Mobler Cards is distributed by mobinaut.io
