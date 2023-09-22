describe('Analyze property market data by month', () => {
    before(() => {
        //let baseUrl = 'https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=POSTCODE%5E1421293&radius=1.0&sortType=6&propertyTypes=&includeSSTC=true&mustHave=&dontShow=&furnishTypes=&keywords='
        let baseUrl = "https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=POSTCODE%5E1421293&maxBedrooms=10&minBedrooms=0&radius=10.0&sortType=6&propertyTypes=semi-detached%2Cterraced&includeSSTC=true&mustHave=&dontShow=newHome%2Cretirement%2CsharedOwnership&furnishTypes=&keywords="
        //let baseUrl = "https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=POSTCODE%5E4701156&maxBedrooms=10&minBedrooms=0&radius=10.0&sortType=6&propertyTypes=detached%2Cflat%2Csemi-detached%2Cterraced&includeSSTC=true&mustHave=&dontShow=retirement%2CsharedOwnership&furnishTypes=&keywords="
        //let baseUrl = "https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=OUTCODE%5E2285&maxBedrooms=10&minBedrooms=0&radius=15.0&sortType=6&propertyTypes=detached%2Cflat%2Csemi-detached%2Cterraced&includeSSTC=true&mustHave=&dontShow=newHome%2Cretirement%2CsharedOwnership&furnishTypes=&keywords="
        //let baseUrl = "https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=POSTCODE%5E1421293&maxBedrooms=3&minBedrooms=2&maxPrice=475000&radius=15.0&sortType=6&propertyTypes=semi-detached%2Cterraced&includeSSTC=true&mustHave=&dontShow=newHome%2Cretirement%2CsharedOwnership&furnishTypes=&keywords="
        //let baseUrl = "https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=POSTCODE%5E1421293&maxBedrooms=4&minBedrooms=2&maxPrice=450000&radius=15.0&sortType=6&propertyTypes=semi-detached%2Cterraced&includeSSTC=true&mustHave=&dontShow=newHome%2Cretirement%2CsharedOwnership&furnishTypes=&keywords="
        // Visit the specified URL
        cy.visit(baseUrl);


        // Handle the cookie pop-up by clicking the "Accept" button
        cy.get('#onetrust-accept-btn-handler').click();
    });

    it('should count "Sold STC" and "Under Offer" properties on all pages and categorize by month', () => {
        let totalSoldSTC = 0;
        let totalUnderOffer = 0;
        let totalAdded = 0;
        let pagesCounted = 0;
        let marketedBy = 0; // needed to catch the properties that can not be attributed to a date
        let unSoldProperties = 0;
        const monthCounts = {};
        const monthPrices = {};

        function extractMonthAndYear(dateString) {
            const currentDate = new Date();
            if (dateString.toLowerCase().includes('today') || dateString.toLowerCase().includes('yesterday')) {
                return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            } else if (dateString === ``) {
                return `1999-01`
            }
            const [day, month, year] = dateString.split('/');
            return `${year}-${month}`;
        }

        function parsePrice(priceString) {
            return parseFloat(priceString.replace('£', '').replace(/,/g, ''));
        }

        function categorizePropertiesByMonth() {
            cy.get('#l-searchResults')
                .find('.propertyCard.propertyCard--fsw-updates:not(.propertyCard--featured)')
                .each(($propertyDiv) => {
                    //cy.log(`============================================================================`)
                    //cy.log(`Reviewing property: ${$propertyDiv.find(`.propertyCard-address.property-card-updates`).text()}`)
                    const propertyStatus = $propertyDiv.find('.propertyCard-tagTitle').text().toLowerCase();
                    const dateElement = $propertyDiv.find('.propertyCard-branchSummary-addedOrReduced');
                    //cy.log(`Property Status: ${propertyStatus}`)
                    //cy.log(`Property added, reduced,marketed by: ${dateElement.text()}`)
                    let dateAddedOrReduced = dateElement.text().trim();
                    //cy.log(`${dateAddedOrReduced}`);
                    const priceElement = $propertyDiv.find('.propertyCard-priceValue');
                    //cy.log(`Property Price (latest): ${priceElement.text()}`)

                    if (dateAddedOrReduced.toLowerCase().includes('today') || dateAddedOrReduced.toLowerCase().includes('yesterday'))
                    {
                        //cy.log(`this was added today or yesterday so assuming this month:`)
                        const currentDate = new Date();
                        dateAddedOrReduced = currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });
                        //cy.log(`Adding date: ${dateAddedOrReduced.toString()}`)
                    }
                   // else if (dateAddedOrReduced.toLowerCase().includes('marketed by'));
                    //{
                    //    dateAddedOrReduced = `01/01/1999`
                    //    marketedBy++
                    //    cy.log(`Logging property as Marketed by. current number of marketed By properties: ${marketedBy.toString()}`)
                   // }

                    const monthYear = extractMonthAndYear(dateAddedOrReduced);
                    const price = parsePrice(priceElement.text());


                    if (!monthCounts[monthYear]) {
                        //cy.log(`Initalising monthly property statistics array (sold, under offer, added)`)
                        monthCounts[monthYear] = { soldSTC: 0, underOffer: 0, added: 0 };
                        monthPrices[monthYear] = [];
                    }

                    if (propertyStatus === 'sold stc') {
                        //cy.log(`Property listed as SOLD STC .... updating counters in the month/year: ${monthYear.toString()}`)
                        totalSoldSTC++;
                        monthCounts[monthYear].soldSTC++;
                        monthPrices[monthYear].push(price);
                    } else if (propertyStatus === 'under offer') {
                        //cy.log(`Property listed as UNDER OFFER .... updating counters in the month/year: ${monthYear.toString()}`)
                        totalUnderOffer++;
                        monthCounts[monthYear].underOffer++;
                    }
                    else {
                        unSoldProperties++;
                        //cy.log("unsold property - but double check line below ");
                        //cy.log(dateAddedOrReduced.toString());
                    }
                    monthCounts[monthYear].added++;
                    totalAdded++;
                    //cy.log(`============================================================================`)
                })
                .then(() => {
                    cy.get('.pagination-button.pagination-direction.pagination-direction--next').then(($nextButton) => {
                        const isDisabled = $nextButton.attr('disabled');
                        if (!isDisabled) {
                            cy.wrap($nextButton).click();
                            pagesCounted++;
                            cy.wait(3000);
                            categorizePropertiesByMonth();
                        } else {
                            //cy.log(JSON.stringify(monthCounts, null, 2));
                            // Convert monthCounts to an array of objects for sorting
                            const monthCountsArray = Object.entries(monthCounts).map(([key, value]) => ({ monthYear: key, ...value }));

                            // Sort the results chronologically
                            monthCountsArray.sort((a, b) => new Date(b.monthYear) - new Date(a.monthYear));

                            // Convert back to an object
                            const sortedMonthCounts = monthCountsArray.reduce((acc, item) => {
                                acc[item.monthYear] = { soldSTC: item.soldSTC, underOffer: item.underOffer, added: item.added };
                                return acc;
                            }, {});

                            cy.get('h1.searchTitle-heading', { timeout: 10000 }) // Increase timeout if necessary
                                .should('be.visible') // Ensure the element is visible
                                .invoke('text')
                                .then((extractedText) => {
                                    cy.log(`Properties Sold and Under Offer by Month with the search: ${extractedText}`);
                                });
                            for (const monthYear in sortedMonthCounts) {
                                const { soldSTC, underOffer, added } = sortedMonthCounts[monthYear];
                                const avgPrice = monthPrices[monthYear].reduce((acc, price) => acc + price, 0) / monthPrices[monthYear].length;

                                cy.log('-----------------------')
                                cy.log(`${monthYear}:`)
                                cy.log(`Added/Reduced in month: ${added}`)
                                cy.log(`Sold STC: ${soldSTC}`)
                                cy.log(`Under Offer: ${underOffer}`)
                                cy.log(`Average Listed Price at Sold STC: £${avgPrice.toFixed(3)}`);
                            }
                            cy.log(`Total "Sold STC" properties: ${totalSoldSTC}`);
                            cy.log(`Total "Under Offer" properties: ${totalUnderOffer}`);
                            cy.log(`Total added properties: ${totalAdded}`);
                            cy.log(`Total pages counted: ${pagesCounted}`);
                            cy.log(`total marketed by without date properties: ${marketedBy}`)
                            cy.log(`total unsold listed properties: ${unSoldProperties}`)
                        }
                    });
                });
        }

        categorizePropertiesByMonth();
    });
});
