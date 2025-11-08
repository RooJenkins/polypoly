import YahooFinance from 'yahoo-finance2';

console.log('YahooFinance:', typeof YahooFinance);
console.log('YahooFinance keys:', Object.keys(YahooFinance).slice(0, 20));

const yahooFinance = new YahooFinance();
console.log('\nyahooFinance instance:', typeof yahooFinance);
console.log('yahooFinance keys:', Object.keys(yahooFinance).slice(0, 20));
console.log('yahooFinance.quote:', typeof yahooFinance.quote);
console.log('yahooFinance.quoteSummary:', typeof yahooFinance.quoteSummary);
