# cookie-monster
## What it does
Cookie Monster is a Chrome browsing extension I developed with the intention of thwarting cookie based tracking when browsing online. It allows you to set rules that determine when cookies are allowed to be set on your browsing session, or alternatively modify cookies that meet specific criteria to further anonymize your online presence and "poison the well" making advertising re-targeting of your online identity impractical and unprofitable. The base concept is simple, if cookies set by 3rd parties attempting to track you are either swapped with randomized values or even the data from other users, 3rd party advertising companies are no longer able to accurately identify you as a unique user and cannot successfully track or advertise to your identity. The extension can either "poison" cookies matching (blacklist) or not matching (whitelist) domains that you specifiy by randomizing their values as they are set or alternatively the extension can "swap" cookies (non session based cookies only as to not facilitate session hijacking) with other users to mix your unique online identity with other users, invalidating any attempts to re-target you as a consumer. The poison functionality of the extension is completed, but the swapping functionality is still under development, as is the ability to aggregate stats on tracking domains and the extent to which cookies your browser receives have been modified by the extension.

## How to use
### Blacklist
Blacklist is the default setting. When using the blacklist, all cookies by default are allowed. Only cookies from domains that you specifically add to the blacklist are intercepted and then removed/poisoned/swapped based on the setting you specify. This mode is easier to configure and more reliable at ensuring the extension does not interfere with sign-ins. However, it is less effective at protecting your privacy.

### Whitelist
Whitelist is the secondary setting. When using the whitelist, all cookies are blocked by default. Only cookies from domains that you specifically add to the whitelist are not intercepted. All others are removed/poisoned/swapped based on the setting you specify. This mode requires that you whitelist the necessary domains for websites you use which set the cookies that allow you to "sign in" and stay "signed in" for that website. If you do not whitelist the appropriate domains, you will not be able to sign into that website. However, if used correctly, this mode completely eliminates cookie based tracking.

### Interception Settings
Remove: Delete the cookie as its set (Eliminates tracking)

Poison: Set the value of the cookie to a random value in the same format (Eliminates tracking and can poison the accuracy of determining your online identity)

Swap: Swap your cookie's value with someone else's (Eliminates tracking and destroys the ability to determine your online identity) **never use for session or authentication cookies**
