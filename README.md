# KitchenWarRoom
Application for the tracking of stats for pantry, fridge, and freezer goods and assisting in the tracking of recipes and weekly+ meal planning

## Intended Development path (and Psuedo-Psuedocode):

1. Ingestion, sorting, and removal of food items
    - Food ingestion will be both manual and via barcode scanning. This will allow the product to be cataloged based off of producer's intentions as well as stats such as weight, nutritional facts, best-by/expiration dates, and more.
    - Food will be mainly sorted via the three areas, pantry, fridge, and freezer. It will be up to the user to fit items inside of these areas but app will be able to track what is in as long as user logs their removal of the items.
    - Removal will entail looking up how much is removed and being able to check if user's supply is getting low (likely ~10% of the average amount of the good). Eventually notifications and services will be active to help assist the user via acknowledging the low supply and providing the option to order from nearby stores online (Or where the nearest store is that has similar products).

2. Recipe tracking, creation, calculations, and replacements
    - Recipe tracking will be done either by linking to a website with your recipe, or creating your own by hand (Will need website capability to allow it to work on non-phone devices)
    - Creation will involve making steps, listing ingredients and sizes, and calculating serving sizes so recipe can be portioned up and down as needed by individual needs
    - Calculations will take from storage and calculate ingredients needed, have, and check for discrepancies between some ingredients (for example: black pepper and bell pepper might be called "Pepper" in some recipes, and system will ensure correct ingredient is used). If ingredients are not available but a replacement is (butter vs margarine, buttermilk vs milk+vingegar mix, etc.) then the replacement will be suggested along with locations to grab the original ingredient.

3. Scheduling meals and prep-assist
    - Integration with calendars to allow user to schedule meals for days of the week or time period of their choosing.
    - Reminders will be sent to help users to prep meals, this will be intended to include times for slow cookers, reminding user when to start and check appliance for readiness (this can include marintaing and settling in fridge, freezing in freezer, and others).
    - Application will be able to schedule ordering goods from stores of choice on set periods, or one time purchases setup in advance.

4. Health assitance and nutrition tracking
    - Application will take nutrion facts from goods and recipes and use them to give insight into users nutrional intake including (but not limited to): Calories (Energy intake), Protein intake, Unhealthy vs Healthy Carbohydrate intake, Unhealthy vs Healthy Fat intake, Vitamins, Minerals, as much as is shown by nutritional facts and known facts about foods ingeneral.
    - Application will be able to look at goods and determine if a healthier alternative is available, mainly looking to root out artificial chemicals, dyes, and flavorings.
    - Application will be able to sync with other health apps to assist in the tracking of weight by providing intake information to apps allowed by user.

5. Other features and assistants
    - Tips and Tricks for cooking, storage of goods, and storage of cooked items
    - Food facts to assist users to know what makes particular foods good and others bad (or less desireable than alternatives).

6. Potential monetization options
    - Deals with advertisers and companies to sell data harvested from users and by providing preferences when suggesting goods to user for restocking, replacements, or alternatives.
    - Integration with devices such as smart fridges
    - Potential for another feature allowing for a "food safe" which allows multiple accounts on a service to have limited access to a small container containing small snacks and similar goods that can be opened using NFC during allowed hours/schedule.