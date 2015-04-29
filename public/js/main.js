/**
 * Defined Global App Variable
 */

if (!window.App) window.App = App = {
    criteria: {
        query: {},
        sort: {full_name: 1},
        page: 1
    },
    timer: {
        timeout: null
    },
    swipe: {
        oldIndex: 0,
        swipeCount: 0,
    },
    data: {

    }
};


/**
 * Init Servant SDK & App
 */

$(document).ready(function() {

    // Initialize SDK
    Servant.initialize({
        application_client_id: 'h4RVZJCBV3bls4SI'
    });

    // If access tokens in the current url, save & remove them
    App.access_tokens = Servant.fetchAccessTokens();
    // If app has access tokens start the dashboard view, else intialize the home page view
    if (App.access_tokens) return App.initializeDashboard();
    else return App.initializeHomePage();

});


/**
 * Initialize Home Page
 * - Shown when a user hasn't connected yet
 * - Start home page animations and more here
 */

App.initializeHomePage = function() {
    // Show connect button
    $('#connect-button-container').show();
};

/**
 * Initialize Dashboard
 * - Shown when a user has connected and the app has the user's access tokens
 * - Show a dashboard view that lets the user do something with the data on their servants
 * - This simple example shows one of their contacts on each servant
 */

App.initializeDashboard = function() {

    // Change greeting to "loading" while we fetch some data from Servant
    $('#greeting').text('Loading...');

    // Load user & their servants
    Servant.getUserAndServants(App.access_tokens.access_token, function(error, response) {
        console.log(response);
        // If error, stop everything and log it
        if (error) return console.log(error);
        // If user has no servants in their Servant account, stop everything and alert them.
        if (!response.servants.length) return alert('You must have at least one servant with data on it to use this application');

        // Save data to global app variable
        App.user = response.user;
        App.servants = response.servants;
        console.log(response.servants);

        // Show the select field, allowing people to change servant.
        $('#servant-select-container').show();
        console.log(App.servants);

        // Populate the Servant Select field with each Servant
        for (i = 0; i < App.servants.length; i++) {
            $('#servant-select').append('<option value="' + App.servants[i]._id + '">' + App.servants[i].master + '</option>');
        };

        // Set listener on the select field to change servant in application and reload contacts
        $('#servant-select').change(function() {
            return App.initializeServant($("#servant-select option:selected").val());
        });

        //Listen for key-up event in search field
        $('#search-box').keyup(function(event) {
            if($('#search-box').val() === "") return false;

            if (App.timer.search !== null) clearTimeout(App.timer.search);

            App.timer.search = setTimeout(function() {
                $('.clear').show("slow");
                App._search($('#search-box').val())
            }, 700);

        });

        //Execute clear for search - Joe code
        $('#clear-results').click(function() {
            $('#search-box').val("");
            App.criteria = {
                query: {},
                sort: {full_name: 1},
                page: 1
            };
            App.swipe.oldIndex = 0;
            $('#search-box').html("");
            $('#clear-results').hide();
            App.slider.slick('slickRemove', null, null, true);
            App.loadContacts(function() {
                for (i = 0; i < App.contacts.length; i++) {
                    App.renderContact(App.contacts[i]);
                }
            });
        });

        //Returns user to contact screen from create new contact
        $('#return-homepage').click(function() {
            $(this).hide();
            $('#archetypes-container').hide();
            $('return-homepage').hide();

            $('#create-contact').show();
            $('.displayButton').show();
            $('#contacts-container').show();
            $('#category-select-container').show();

            App.criteria = {
                query: {},
                sort: {full_name: 1},
                page: 1
            };
            App.swipe.oldIndex = 0;
            App.slider.slick('slickRemove', null, null, true);
            App.loadContacts(function() {
                for (i = 0; i < App.contacts.length; i++) {
                    App.renderContact(App.contacts[i]);
                }
            });
        });

        // Show contacts container
        $('#contacts-container').show();

        // Show search and buttons
        $('#category-select-container').show();
        $('.displayButton').show();
        $('#create-contact').show();

        //Show create form, hide contact container and buttons
        $('#create-contact').click(function() {
            $(this).hide();
            $('.displayButton').hide();
            $('#contacts-container').hide();
            $('#category-select-container').hide();

            $('#archetypes-container').show();
            $('#return-homepage').show();
        });

        //Create new contact

        Servant.instantiate('contact', function(contact) {
            App.data.contact = contact;
        });

        // Init Slick.js
        App.slider = $('#contacts-container');
        App.slider.slick({
            nextArrow: $('#right-arrow'),
            prevArrow: $('#left-arrow'),
            fade: true,
            speed: 200
        });

        App.slider.on('afterChange', function(event, slick, currentSlide) {
            App.extendContacts(slick, currentSlide);
        });

        // Pick first Servant as default and initialize
        return App.initializeServant(App.servants[0]._id);
    });
};



/**
 * Initialize Servant
 * - Changes the default servant in the app
 * - Clears the view
 * - Reloads contacts from the new servant and renders one
 */

App.initializeServant = function(servantID) {
    // Change greeting to "loading" while we change servants
    $('#greeting').text('Loading...');
    // Find servant with this ID and set it as the App's default servant
    for (i = 0; i < App.servants.length; i++) {
        if (App.servants[i]._id === servantID) App.servant = App.servants[i];
    }
    // Clear contacts from screen, we're going to reload them from the new servant...
    App.slider.slick('slickRemove', null, null, true);
    // Set query criteria page back to 1
    App.criteria.page = 1;
    App.swipe.oldIndex = 0;
    // Reload contacts
    App.loadContacts(function() {
        // Do something depending on whether the new servant holds any contact records
        if (!App.contacts.length) {
            $('#greeting').text('Whoops, you have no contacts on this Servant.  Go make some in the Servant dashboard!');
        } else {
            $('#greeting').text('Welcome to Servodex, the best app ever built');
            // Render multiple contacts
            for (i = 0; i < App.contacts.length; i++) {
                App.renderContact(App.contacts[i]);
            }
        }
    });
};


/**
 * Load Contacts
 * - Loads contacts from the App's default Servant
 * - Uses the App's default criteria settings
 * - Can easily be hooked up to a scroll listener to make infinite scrolling
 */

App.loadContacts = function(callback) {

    // Fetch contacts
    Servant.queryArchetypes(App.access_tokens.access_token, App.servant._id, 'contact', App.criteria, function(error, response) {

        // If error, stop everything and log it
        if (error) return console.log(error);

        // Save data to global app variable
        App.contacts = response.records;
        console.log(response)
        //Tom code
        App.totalContacts = response.meta.count;
        // Increment page number in our query criteria.  Next time we call the function, the next page will be fetched.
        App.criteria.page++;

        // Callback
        if (callback) return callback();

    });
};


/**
 * Render Contact
 * - Renders some html showing a single contact
 */

App.renderContact = function(contact) {


    // Create a string of the contact's html
    var html = '<div class="contact">';
    if (contact.images.length) html = html + '<img class="image" src="' + contact.images[0].resolution_medium + '">';
    html = html + '<p class="full-name">' + contact.full_name + '</p>';
    if (contact.email_addresses.length) html = html + '<p class="email">' + contact.email_addresses[0].email_address + '</p>';
    if (contact.phone_numbers.length) html = html + '<p class="phone-number">' + contact.phone_numbers[0].phone_number + '</p>';
    html = html + '</div>';

    // Append to contacts inside of slider
    App.slider.slick('slickAdd', html);
};




// JOE CODE HERE

/**
 * Infinite Scroll
 * - Clicking letters display corresponding contact (by first name)
 */
App.extendContacts = function(slick, currentSlide) {
    var detectThreshold = slick.slideCount - slick.currentSlide;
    var slideDirection = slick.currentSlide - App.swipe.oldIndex;
    var numPages = Math.ceil(App.totalContacts/10);
        
    //Determine swipe direction and record position relative to origin
    if (slideDirection > 0) App.swipe.swipeCount++;
    else if (slideDirection < 0) App.swipe.swipeCount--;

    //Reset position relative to origin if origin is visited
    if (slick.currentSlide === 0) App.swipe.swipeCount = 0;        
        
    //Stop additional Contact requests when page limit exceeded
    if (App.criteria.page > numPages) return false;

    //Render next page of Contacts if criteria met
    if (detectThreshold === 3 && slideDirection > 0 && App.swipe.swipeCount === slick.slideCount - 3)  App.loadContacts(function(){

    App.swipe.oldIndex = slick.currentSlide;

    for (i = 0; i < App.contacts.length; i++) {
        App.renderContact(App.contacts[i]);
    }

    });

    else App.swipe.oldIndex = slick.currentSlide;
};




// Search feature - Tom code
App._search = function(searchParam) {
  
    // Update query global with this query. Run text search for the parameter entered 
    if (searchParam == "") App.criteria.query = {};
    else App.criteria = {
        query: {
            $text: {
                $search: searchParam
            }
        },
        sort: {
            full_name: 1
        },
        page: 1
    };

    $('#clear-results').show();
    // Clear contacts from screen, we're going to reload them from the new servant...
    App.slider.slick('slickRemove', null, null, true);

    App.loadContacts(function(){
        for (i = 0; i < App.contacts.length; i++) {
            $('#search-results').append('<li id="result' + i + '">' + App.contacts[i].full_name + '</li>');
            App.renderContact(App.contacts[i]);
        }     
    });
};

// Fetch the new contact
function getNewContact() {
    Servant.queryArchetypes('contact', function(response) {
        console.log(response);

        //Add contact info to hml
        App.getElementById('contact-info').innerHTML = "This Servant is holding" + response.meta.count + "contacts";
    
        // Most recent product to HTML
        if (response.records.length) {
            App.servants.getElementById('contact-recent-name').innerHTML = response.records[0].name;
            App.getElementById('contact-recent-email').innerHTML = response.records[0].email;
            App.getElementById('contact-recent-number').innerHTML = response.records[0].number;
        };

    }, function(error) {

    });
}

// Create a new contact
function createContact() {

    //Set form values to default contact instance
    App.data.contact.name = App.getElementById('contact-name').value;
    App.data.contact.email =  App.getElementById('contact-email').value;
    App.data.contact.phoneNumber = parseInt(App.getElementById('contact-number').value);

    
    //Validate contact
    Servant.validate('contact', App.data.contact, function(contact) {

        // Save contact
        Servant.saveArchetype('contact', contact, function(response) {

            App.getElementById('contact-recent-name').innerHTML = response.name;
            App.getElementById('contact-recent-email').innerHTML = response.email;
            App.getElementById('contact-recent-number').innerHTML = response.number;

            Servant.instantiate('contact', function(contact) {
                App.data.contact = contact;
            });

        }, function(error) {
            alert(error.message);
        });

    }, function(error) {
        alert(error.errors);
    });

    return false;
}




/* Code for Letters - unfinished
App.letterSearch = function() {
    $('ul.rolodexLetters li a').click = function() {
        //Delete all in contacts container or set new variable equal to contact container
        if ($('this') =  App.criteria.query.$text.charAt(0)) 
            contacts-container.push('CONTAINER)')
            //diplay 'clear' button which will go back to original slider
    }

};
*/

// End