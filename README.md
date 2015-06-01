###How To Start

Since this and the `payments` package are not published to atmosphere at this time, you must `git clone` both this and the [payments package](https://github.com/themeteorites/payments) manually

~~~meteor add themeteorites:paypal~~~

####Configure

Set up your PayPal configuration (client_id, client_secret, and mode) in one of the following two ways

######Option 1: Store Your Config In A Collection
1. Add the `{{ > adminConfig }}` template which provides an insert form to store your information in the PayPal collection

2. On the server set:
    PayPal.configId = 'Your _id of the document you inserted from the form in the previous step'

Or if you don't want to store your information in a collection, the recommended route is to store it in a .json file. Make sure you do not commit your sensitive info into git!

######Option 2: Add Your Config via settings.json

```json
{
    "paypal": {
        "mode": "sandbox",
        "client_id": "4ifuRqsFoeeaj5ibv",
        "client_secret": "fPkrnUxGIOfUkT6BFj2K4h3PEAMSf8ongCrDjnOz6Oq"
    },
    "public": {
        "paypal": {
            "redirect_urls": {
                "return_url": "http://localhost:3000/return",
                "cancel_url": "http://localhost:3000/cancel"
            }
        }
    }
}
```

####Set Up Your Product Info
You need to setup your product info like so

home.html

```html
<template name="home">
    {{ > _paypalButton product=info }}
</template>
```


home.js

```javascript
Template.home.helpers({
    info: {
        name: 'Basketball',
        sku: 'BB',
        price: '15.00',
        currency: 'USD',
        quantity: '2',
        description: 'A full-sized basketball',
        amount: {
          currency: 'USD',
          total: '30.00'
        }
    }
});
```

```
name
sku
price
currency
quantity
description
amount
amount.currency
amount.total
```
^ Are required properties for your product

#The Following Is A Work-In-Progress

####Set Up Your validatePurchaseAttempt

You must return a truthy value to allow processing of the payment

```javascript
PayPal.validatePurchaseAttempt = function(){

    return true;
};
```


####Set Up Your OnSuccess/onError Hooks

On the server declare an expression

```javascript
PayPal.onSuccess = function(order){
    // Do stuff here on successful processing of payment
};

PayPal.onError = function(order){
    // Do stuff here on failure processing of payment
};
```

`order` returns the following properties:

```javascript
state   =>  State of the payment
sku
time
provider
action
httpStatusCode
```