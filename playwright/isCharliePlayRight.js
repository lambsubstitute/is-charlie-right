const { chromium } = require('playwright');

describe('Analyze property market data by month', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await chromium.launch();
        page = await browser.newPage();

        const baseUrl =
            'https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=POSTCODE%5E1421293&maxBedrooms=10&minBedrooms=0&radius=10.0&sortType=6&propertyTypes=semi-detached%2Cterraced&includeSSTC=true&mustHave=&dontShow=newHome%2Cretirement%2CsharedOwnership&furnishTypes=&keywords=';

        await page.goto(baseUrl);

        // Handle the cookie pop-up by clicking the "Accept" button
        await page.click('#onetrust-accept-btn-handler');
    });

    afterAll(async () => {
        await browser.close();
    });

    it('should count "Sold STC" and "Under Offer" properties on all pages and categorize by month', async () => {
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
            if (
                dateString.toLowerCase().includes('today') ||
                dateString.toLowerCase().includes('yesterday')
            ) {
                return `${currentDate.getFullYear()}-${String(
                    currentDate.getMonth() + 1
                ).padStart(2, '0')}`;
            } else if (dateString === '') {
                return `1999-01`;
            }
            const [day, month, year] = dateString.split('/');
            return `${year}-${month}`;
        }

        function parsePrice(priceString) {
            return parseFloat(priceString.replace('£', '').replace(/,/g, ''));
        }

        async function categorizePropertiesByMonth() {
            const propertyDivs = await page.$$(
                '.propertyCard.propertyCard--fsw-updates:not(.propertyCard--featured)'
            );

            for (const $propertyDiv of propertyDivs) {
                const propertyStatus = await $propertyDiv.$eval(
                    '.propertyCard-tagTitle',
                    (tag) => tag.textContent.toLowerCase()
                );
                const dateElement = await $propertyDiv.$(
                    '.propertyCard-branchSummary-addedOrReduced'
                );
                let dateAddedOrReduced = await dateElement.textContent();

                const priceElement = await $propertyDiv.$('.propertyCard-priceValue');
                const price = parsePrice(await priceElement.textContent());

                if (
                    dateAddedOrReduced.toLowerCase().includes('today') ||
                    dateAddedOrReduced.toLowerCase().includes('yesterday')
                ) {
                    const currentDate = new Date();
                    dateAddedOrReduced = currentDate.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric',
                    });
                }

                const monthYear = extractMonthAndYear(dateAddedOrReduced);

                if (!monthCounts[monthYear]) {
                    monthCounts[monthYear] = { soldSTC: 0, underOffer: 0, added: 0 };
                    monthPrices[monthYear] = [];
                }

                if (propertyStatus === 'sold stc') {
                    totalSoldSTC++;
                    monthCounts[monthYear].soldSTC++;
                    monthPrices[monthYear].push(price);
                } else if (propertyStatus === 'under offer') {
                    totalUnderOffer++;
                    monthCounts[monthYear].underOffer++;
                } else {
                    unSoldProperties++;
                }
                monthCounts[monthYear].added++;
                totalAdded++;
            }

            const nextButton = await page.$('.pagination-button.pagination-direction.pagination-direction--next');
            const isDisabled = await nextButton.getAttribute('disabled');

            if (!isDisabled) {
                await nextButton.click();
                pagesCounted++;
                await page.waitForTimeout(3000); // You may adjust the wait time as needed
                await categorizePropertiesByMonth();
            } else {
                // Sort the results chronologically
                const monthCountsArray = Object.entries(monthCounts).map(
                    ([key, value]) => ({ monthYear: key, ...value })
                );
                monthCountsArray.sort(
                    (a, b) => new Date(b.monthYear) - new Date(a.monthYear)
                );

                // Output the results
                const sortedMonthCounts = monthCountsArray.reduce((acc, item) => {
                    acc[item.monthYear] = {
                        soldSTC: item.soldSTC,
                        underOffer: item.underOffer,
                        added: item.added,
                    };
                    return acc;
                }, {});

                console.log(`Properties Sold and Under Offer by Month:`);
                for (const monthYear in sortedMonthCounts) {
                    const { soldSTC, underOffer, added } = sortedMonthCounts[monthYear];
                    const avgPrice =
                        monthPrices[monthYear].reduce((acc, price) => acc + price, 0) /
                        monthPrices[monthYear].length;

                    console.log('-----------------------');
                    console.log(`${monthYear}:`);
                    console.log(`Added/Reduced in month: ${added}`);
                    console.log(`Sold STC: ${soldSTC}`);
                    console.log(`Under Offer: ${underOffer}`);
                    console.log(`Average Listed Price at Sold STC: £${avgPrice.toFixed(3)}`);
                }
                console.log(`Total "Sold STC" properties: ${totalSoldSTC}`);
                console.log(`Total "Under Offer" properties: ${totalUnderOffer}`);
                console.log(`Total added properties: ${totalAdded}`);
                console.log(`Total pages counted: ${pagesCounted}`);
                console.log(`Total marketed by without date properties: ${marketedBy}`);
                console.log(`Total unsold listed properties: ${unSoldProperties}`);
            }
        }

        await categorizePropertiesByMonth();
    });
});
