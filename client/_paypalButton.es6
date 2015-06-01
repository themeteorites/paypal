function goTo(url){
    // Go to approval_url
    return window.location.href = url;
}

function errorCB(error){
    console.error(error);
}

Template._paypalButton.events({
    'click button': function(){
        var self = this;

        var product = {
            name: self.name,
            sku: self.sku,
            price: self.price,
            currency: self.currency,
            quantity: self.quantity,
            amount: {
                currency: self.amount.currency,
                total: self.amount.total
            },
            description: self.description
        };

        console.group('Product');
        console.dir(product);
        console.groupEnd();

        PayPal.create(product).then(goTo).catch(errorCB);
    }
});