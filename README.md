# KitchenWarden
Application for the tracking of stats for pantry, fridge, and freezer goods and assisting in the tracking of recipes and weekly+ meal planning

## Description
KitchenWarden is a webapp with the purpose of being able to contain, monitor, and manage as many aspects of the kitchen experience as possible. It utilizes a back-end server running Postgresql and hosting a website to allow users to access their own accounts and input their kitchens food stores, their locations, and amounts.

## Motivation
KitchenWarden is a solution to my own scenario with using multiple spreadsheets to track my recipes, their costs, and the foods required to make them. It combines all aspects of the kitchen experience that I (and others I presume) find either tedious, complicated, or simplye interferes with our lives. It simplifies by automating a lot of the thinking and calculations that go into making food at home, and will hopefully be a tool many see as useful.

## Quick Start
Hopefully this ends up being no more than "log right on in and check it out", but until it is public, you can start your own.

### Prerequisites
- Node.js 26 (see `.nvmrc`) and npm
- A running PostgreSQL server with an empty database, such as `kwr_dev`

### Setup
1. Install dependencies from the repository root:
   ```
   npm install
   ```
2. Copy the example config to the local config path (gitignored):
   ```
   cp src/kw.config.example.json src/kw.config.json
   ```
3. Edit `src/kw.config.json` and set `db_url` to your PostgreSQL connection string, for example `postgresql://USER:PASSWORD@127.0.0.1:5432/kwr_dev`. Leave `current_user_name` empty; the CLI fills it in.
4. Apply the database migrations:
   ```
   npm run migrate
   ```
5. Register your profile. It becomes the current user:
   ```
   npm start -- register <username>
   ```
## Usage

### Commands
| Command | Purpose |
|---|---|
| `npm start -- register <username>` | Create a profile and make it the current user |
| `npm start -- login <username> [password]` | Switch to an existing profile; the password is required if one is set |
| `npm start -- list` | List all profiles with ID, email, and phone |
| `npm start -- password <password>` | Set the current user's password |
| `npm start -- email <address>` | Set the current user's email |
| `npm start -- phone <number>` | Set the current user's phone number as 10 digits, e.g. `7036878555` |
| `npm run typecheck` | Type-check the CLI codebase |

## Contributing

### Clone the repo

```bash
git clone https://github.com/kramdan/KitchenWarden@latest
cd KitchenWarden
```

### Build and run the project
This will fail on first attempt, check setup section step 2 for instructions

```bash
npm run build
npm run start:build # This involves commands from the usage section above, it will do nothing otherwise.
```

### Run tests

```bash
npm run test
```

## Intended Development path (Psuedocode):

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