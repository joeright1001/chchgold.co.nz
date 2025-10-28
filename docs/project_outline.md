NEW PROJECT CHCH GOLD BULLION QUOTE

I wish to create project - new git repo, local folder, domain and railway project.

This project is called ChchGold Sell Bullion Quote


Requirements:

1) A simple website on the seperate domain chchgold.co.nz with a seperate webserver and database.

2) The goal of this website to improve how customers / general public sell their bullion to us and improve how we reach an agreed price.


3) This website will have three key componments:
a) An Admin / staff / dealer view to create a quote based on an item name, drowdowns, and a calucated value based on the current spot price. (/quote/create
b) A customer view of the quote using a url in the format chchgold.co.nz/quote/xxxxxxxxxxxxxxxxxxx. We will email or txt the customer the URL and they access with there mobile number as the password / username. (/quote/id)
c) A dashboard view of all the quotes with the quote number that can be clicked to show the record. (/admin).


4) The customer view will have a template what will have key instruction information, the current spot price in big numbers with timestamp, steps to proceed, etc. This will be an exported webflow template.

5) The dealer create page (/create/) wil also use the same template, however, the /create view will only be accessabile to the dealer.

6) The /edit/id page will also for edits and updating the live price / calucation. NOTE: this view hides ALL customer deatils such as name, zoho id, etc.




Workflow:

1) A staff member / gold merchant to logon to an admin veiw with a password and username.
2) Input between 1 to 8 rows of item details. The rows are always shown even if only one item is needed. This inculde item name, metal type (dropdown), percent (manaul input - eg. 3.4%) weight (dropdown). 
3) Have a button called "Live Price" which fetches gold and silver spot price from an existing API service and calucates to the prices of the item. The row has a total and a grand total shown below. As soon as the Live Price is clicked - this creates a quote number in this format starting at this number "SBQ-00284". This also creates a valid URL for the quote. This also creates a valid URL for customer access to the quote in view only mode. The staff view changes to /edit/:id.
5) the customer use the link to view the quote.

Note: The /admin list of all quotes has two lins to access quote details- the Admin and Edit. The Edit hides customer information. The Edit view will be used infront of the customer and I do not want to show details like the zohoid or other info that many be included. The Edit view will be used to update the price and percent to close the deal.



Application Pages

Application Pages

__1. `/quote/create` (New Quote Creation)__

- __Access:__ Staff login required.

- __UI & Data Entry:__

  - A form for customer details: First Name, Surname, Mobile, Email, ZohoID.
  - Displays 8 blank item rows, each with fields for `Item Name`, `Metal Type`, `Percent`, and `Weight`.
  - A button labeled __"Get Live Price & Create Quote"__.

- __Process:__

  1. The staff member fills in all customer and item details.
  2. They click the "Get Live Price & Create Quote" button.
  3. This action sends all form data to the backend. The backend __creates the new quote and item records__ in the database, fetching the initial spot price.
  4. The backend then redirects the staff member to the __"In-Person" Edit View__ at `/quote/edit/:id` for the newly created quote.


__2. `/admin` (Admin Dashboard)__

- __Access:__ Staff login required.

- __UI:__ A table of all quotes. Each row has two links:

  - __"Edit"__: Goes to `/quote/edit/:id`.
  - __"Admin"__: Goes to `/quote/admin/:id`.

__3. `/quote/edit/:id` ("In-Person" Edit View)__

- __Access:__ Staff login required.
- __Purpose:__ For use in front of the customer.
- __Data Visibility:__ __HIDES__ all customer personal information.
- __Functionality:__ Displays the 8 item rows with their data. Allows editing of `percent` and `weight`, and has a __"Refresh Live Price"__ button.

__4. `/quote/admin/:id` (Full Admin View)__

- __Access:__ Staff login required.
- __Purpose:__ Internal master record view.
- __Data Visibility:__ Shows __ALL__ data, including all customer details and all 8 item rows.

__5. `/quote/:id` (Customer View)__

- __Access:__ Customer authenticates with their mobile number or email.
- __Data Visibility:__ Read-only view of the quote items and prices. __No personal customer information is shown.__




Database Schema (Final Two-Table Relational Model)

__Table 1: `quotes`__ This table holds the main information for each quote, with dedicated columns for the key spot prices.

| Column Name | Data Type | Description | | :--- | :--- | :--- | | `id` | `UUID` | Primary Key. | | `quote_number` | `VARCHAR(255)` | Human-readable ID (e.g., `SBQ-00284`). | | `customer_first_name` | `VARCHAR(255)` | Customer's first name. | | `customer_surname` | `VARCHAR(255)` | Customer's surname. | | `customer_mobile` | `VARCHAR(255)` | Customer's mobile number. | | `customer_email` | `VARCHAR(255)` | Customer's email. | | `zoho_id` | `VARCHAR(255)` | Customer's Zoho ID. | | __`spot_price_gold`__ | `DECIMAL(10,4)` | The spot price of gold at the time of the last update. | | __`spot_price_silver`__ | `DECIMAL(10,4)` | The spot price of silver at the time of the last update. | | `totals` | `JSONB` | Calculated grand total. | | `created_at` | `TIMESTAMPTZ` | Timestamp of creation. | | `updated_at` | `TIMESTAMPTZ` | Timestamp of last price update. |

__Table 2: `quote_items`__ This table holds the individual line items for each quote.

| Column Name | Data Type | Description | | :--- | :--- | :--- | | `id` | `UUID` | Primary Key for the item itself. | | `quote_id` | `UUID` | __Foreign Key__ that links this item to a record in the `quotes` table. | | `item_name` | `TEXT` | Name for the item. | | `metal_type` | `VARCHAR(50)` | Metal type for the item. | | `percent` | `DECIMAL(5,2)` | Purity/percent for the item. | | `weight` | `DECIMAL(10,2)` | Weight for the item. |









Out of scope:


1) No "accpet" or "reject".




Design:

1) Deployed to railway.
2) Just one branch - main and one deployment.
3) Postgre SQL.
4) Two tables - quote to many quote_items.
5) Porkbun DNS - https needed. I already have a railway account.
6) The root chchgold.co.nz and www.chch.co.nz needs to redirect to www.christchurchgold.co.nz webflow site.
