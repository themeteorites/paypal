###How To Start

Since this and the `payments` package are not published to atmosphere at this time, you must `git clone` both this and the [payments package](https://github.com/themeteorites/payments) manually

~~~meteor add themeteorites:paypal~~~

####Configure

Set up your PayPal configuration (client_id, client_secret, and mode)

######Option 1 (Hard Code It)

On the server:
```javascript
PayPal.configure({
    mode: 'sandbox',
    client_id: '12345abcd',
    client_secret: '12345abcd',
    redirect_urls: {
        return_url: 'myapp.com/return',
        cancel_url: 'myapp.com/cancel'
    }
});
```

######Option 2 (Setup via Collections)

Add the template `{{ > _paypalConfig }}`

It renders an insert form for your PayPal configuration

On that template insert your settings and click `Set`

If you go this route you need to hit `Set` on every server startup, so you may want to either hard-code the settings document:

```javascript
PayPal.configure(PayPal.config.findOne());
```

or use the settings.json method below. 


######Option 3 (Add via .json)
**Recommended**

On the server:
```javascript
PayPal.configure(Meteor.settings.paypal);
```

*Recommended

####Set Up Your Product Info
You need to setup your product info like so

`home.html`

```html
<template name="home">
    {{ > _paypalButton product=info }}
</template>
```


`home.js`

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

Required properties for product info:
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

####Set Up validateProcessAttempt

You can stop the payment process by returning a falsy value or by throwing an exception

```javascript
PayPal.validateProcessAttempt(function(options){
    return stopPayment();
});
```

`options` returns:

```javascript
payerId
paymentId
```

####Set Up Your OnPaymentSuccess

On the server declare an expression

```javascript
PayPal.onPaymentSuccess(function(order){
    // Do stuff here on successful processing of payment
    // Returns true on client
    // Returns order object on the server
});

####Set Up onPaymentFailure

PayPal.onPaymentFailure(function(order, errorMsg){
    // Do stuff here on failure processing of payment
    // Returns order object on the server
});
```

`order` returns the following properties:

```javascript
state
sku
time
provider
action
httpStatusCode
```

##Payments

Payments get reported to the `Payments` collection, and you can view them by adding the `{{ > _paymentStatus }}` template