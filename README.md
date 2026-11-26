# KitchenWarden
Application for the tracking of stats for pantry, fridge, and freezer goods and assisting in the tracking of recipes and weekly+ meal planning

## Description
KitchenWarden is a webapp with the purpose of being able to contain, monitor, and manage as many aspects of the kitchen experience as possible. It utilizes a back-end server running Postgresql and hosting a website to allow users to access their own accounts and input their kitchens food stores, their locations, and amounts.

## Motivation
KitchenWarden is a solution to my own scenario with using multiple spreadsheets to track my recipes, their costs, and the foods required to make them. It combines all aspects of the kitchen experience that I (and others I presume) find either tedious, complicated, or simply interferes with our lives. It simplifies by automating a lot of the thinking and calculations that go into making food at home, and will hopefully be a tool many see as useful.

## Quick Start
Eventually this ends up being no more than "log right on in and check it out", but until it is there, you can start your own.

### Prerequisites
- Node.js 26 (see `.nvmrc`) and npm
- A running PostgreSQL server with an empty database, such as `kwr_dev`
- Docker (optional, only for the container run)

### Setup
1. Install dependencies from the repository root:
   ```
   npm install
   ```
2. Create the local environment file. It is gitignored:
   ```
   cp src/.env.example src/.env
   ```
   Edit `src/.env` and set:
   - `DATABASE_URL`: your PostgreSQL connection string, for example `postgresql://USER:PASSWORD@127.0.0.1:5432/kwr_dev`
   - `DOWNLOAD_SIGNING_KEY`: 64 hexadecimal characters. You can generate one with `openssl rand -hex 32`
3. Apply the database migrations:
   ```
   npm run migrate
   ```
4. Start the server, then open the site:
   ```
   npm run start:dev
   ```
   Open `http://localhost:3000`.
5. Sign up at `/auth/register` with your first and last name, an email address, and a password of 12 to 128 characters.

## Dev tools

`npm run start:dev` sets `DEV_TOOLS=true`, which enables `/health` and `/reset`. `/reset` shows a confirmation page, and its button deletes every user account. Do not set `DEV_TOOLS` in `src/.env` or in the Docker run; those must keep the dev routes off.

## Usage

### Web pages
- `/` is the home page. Signed-in users are redirected to `/account`.
- `/auth/register` creates an account. Names contain letters only. Email is required and is stored in lowercase.
- `/auth/login` signs in with your email and password.
- `/account` changes your email, phone number, or password, or deletes your account.
- The menu at the top right of each signed-in page links to your account and signs you out.

`npm run start:dev` and `npm run start:build` serve the site on localhost only. Set `PORT` to use another port.

Sessions end 60 minutes after the last request, and at most 24 hours after sign-in. Failed logins are limited to 5 in 15 minutes per email and per client IP. The counters are kept in memory and reset when the server restarts.

## Contributing

### Clone the repo

```bash
git clone https://github.com/kramdan/KitchenWarden@latest
cd KitchenWarden
```

### Build and run the project
This needs `src/.env` (see Setup, step 2).

```bash
npm run build
npm run start:build # Serves the site at http://localhost:3000 until Ctrl+C.
```

### Type-check

```bash
npm run typecheck
```

### Docker

The image runs the built `dist/` folder. The database URL and signing key are supplied at run time from an env file. They are never copied into the image.

```bash
npm run build
docker build -t kitchenwarden .
docker run --rm -it --network host --env-file src/.env kitchenwarden
```

`--network host` lets the container reach PostgreSQL and the website on `127.0.0.1`, so this works on Linux only. The container runs as the `node` user (uid 1000). Logs are written inside the container and are lost when it is removed.

### Run tests

```bash
npm run test
```

The test suite is being rewritten, so it may report no tests until that is done.

### Reset users

Not available. The reset command was removed with the command-line tool. The reset code remains in `src/dev` and will return as a web route. That route needs explicit approval, because it deletes every registered user.

## Using Agents
Agents are used in this project, though not solely or extensively, and there are included in the project some files that can assist you if you choose to use them yourself. You take responsibility for anything the agent or model writes at your instruction, and anything written by AI must be reviewed by a human before believing it ready for production and/or distribution.

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
