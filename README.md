# Stripe Subscription And One Time Payment


## Overview
The StripeSubscriptionService is an API for managing Stripe subscriptions. It provides endpoints for user registration, login, subscription creation, user detail retrieval, and managing subscriptions via the Stripe customer portal. This service uses Bearer token authentication for secure access to certain endpoints. And also One Time payment with Stripe

Base URL
The base URL for the API is:   http://localhost:2132/


## Features
Create: Create customer and the Subscription using routes
Create: Create One Time Payment
Read: View the full Detail of the user Subscription And The Payment History
Update: Upgrate and Downgrade the user subscription

## Prerequisites
Before you begin, ensure you have the following installed:
```
1. Node.js (v20.15.0 or higher)
2. Npm (Node Package Manager)
3. A MongoDB database (either a local instance or a MongoDB Atlas cloud database)
4. Stripe (For connect withe stripe )
5. jsonwebtoken ( For the token)
6. bcrypt (For hashing password)
7. express (For the server)
8. mongoose (For the connect the MongoDb database)
9. cors (For WhiteListing the frontend)
10. validator (For check email is valid or in valid format)
11. dotenv (For Environment variables)
```
## Installation
Follow these steps to set up and run the project locally:

## Clone the repository:
```
git clone https://github.com/Gaganrobin8831/stripeSubscription02.git
```
## Install dependencies:
```
npm install
```
## Set up the environment variables:
```
STRIPE_WEBHOOK_SECRET_KEY: **stripe webhook key**

BASE_URL : **frontend url**

STRIPE_SECRET_KEY: **stripe secret key from stripe**

PORT = 2132

MONGO_URI : **MongoDb compaas or atls connection string**

DB_NAME : **Any Name**

secret : **Any secret for token create and verify**
```
------------------------------------------------------------------------------------------------------
## Start the application:
```
npm start
```

## Swagger Testing
This project includes a swagger.yaml file that defines the API endpoints, request parameters, and responses in a standardized OpenAPI format. You can use this file to test and document the API.

Using the **swagger.yaml** File
## Use an Online Swagger Editor:

Visit the Swagger Editor.
Copy the contents of the **swagger.yaml** file from your project.
Paste the contents into the editor.
The Swagger Editor will display the API documentation, allowing you to interact with and test the API endpoints directly from the browser.


---
### Postman Collection for API Testing
To make API testing easier, a Postman collection is provided for this project. This collection includes all the necessary endpoints and can be used to quickly test the API without manually configuring each request.

### Importing the Postman Collection
Follow these steps to import the Postman collection:

**1. Download the Postman Collection:**

The Postman collection file (stripe.postman_collection.json) is included in the repository.

**2. Import the Collection into Postman:**

Open Postman.
Click on the "Import" button in the top left corner.
Select the stripe.postman_collection.json file from your local machine.
Click "Open" to import the collection.

**3. Start Testing:**

Once the collection is imported, you can start making requests to the API endpoints defined in the collection. Each request includes predefined settings for method, URL, headers, and body, making it easier to test the API.
