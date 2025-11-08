# Comprehensive Testing Strategy - PolyStocks

## Test Execution Date: 2025-11-05

---

## 1. AI MODELS TESTING

### Test Objective
Verify all 6 AI models make decisions correctly and generate detailed reasoning

### Test Cases
- [ ] 1.1 GPT-4o Mini generates decisions with 200+ char reasoning
- [ ] 1.2 Claude Haiku generates decisions with 200+ char reasoning
- [ ] 1.3 Gemini Flash generates decisions with 200+ char reasoning
- [ ] 1.4 DeepSeek generates decisions with 200+ char reasoning
- [ ] 1.5 Qwen generates decisions with 200+ char reasoning
- [ ] 1.6 Grok generates decisions with 200+ char reasoning
- [ ] 1.7 All models respond within reasonable time (<30s)
- [ ] 1.8 All models include targetPrice and stopLoss for BUY/SHORT actions
- [ ] 1.9 All models provide invalidation conditions
- [ ] 1.10 Confidence scores are between 0.5 and 1.0

### Test Data
- Run manual trading cycle
- Inspect Decision table for latest entries
- Verify reasoning field length and quality

---

## 2. TRADE EXECUTION TESTING

### Test Objective
Verify all trade types execute correctly with accurate calculations

### Test Cases
- [ ] 2.1 BUY orders execute at correct price
- [ ] 2.2 BUY orders deduct correct amount from cash balance
- [ ] 2.3 BUY orders create Position records correctly
- [ ] 2.4 SELL orders execute at correct price
- [ ] 2.5 SELL orders add proceeds to cash balance
- [ ] 2.6 SELL orders remove Position records
- [ ] 2.7 SELL orders calculate realizedPnL correctly
- [ ] 2.8 HOLD actions don't execute any trades
- [ ] 2.9 Position sizing respects confidence levels (60%→10%, 80%→20%, 90%→25%)
- [ ] 2.10 Slippage is applied correctly

### Test Data
- Execute trades for each agent
- Compare before/after cash balances
- Verify Trade records match Position changes

---

## 3. FINANCIAL CALCULATIONS TESTING

### Test Objective
Verify all financial metrics are calculated accurately

### Test Cases
- [ ] 3.1 accountValue = cashBalance + sum(positions)
- [ ] 3.2 unrealizedPnL = (currentPrice - entryPrice) * quantity
- [ ] 3.3 unrealizedPnLPercent = ((currentPrice - entryPrice) / entryPrice) * 100
- [ ] 3.4 realizedPnL = (exitPrice - entryPrice) * quantity - commission
- [ ] 3.5 totalPnL = accountValue - startingValue
- [ ] 3.6 ROI = (totalPnL / startingValue) * 100
- [ ] 3.7 Sharpe ratio calculated from daily returns
- [ ] 3.8 Max drawdown tracked correctly
- [ ] 3.9 Win rate = winning trades / total trades
- [ ] 3.10 All dollar amounts have 2 decimal precision

### Test Data
- Pull agent data from /api/agents
- Manually recalculate each metric
- Compare with database values

---

## 4. S&P 20 BENCHMARK TESTING

### Test Objective
Verify benchmark tracks equal-weighted index correctly

### Test Cases
- [ ] 4.1 Benchmark agent exists with ID 'benchmark-sp20'
- [ ] 4.2 Initial value is exactly $10,000
- [ ] 4.3 Positions are equal-weighted ($500 each)
- [ ] 4.4 Benchmark updates every trading cycle
- [ ] 4.5 BenchmarkPosition table has 20 records
- [ ] 4.6 accountValue = sum(shares * currentPrice) for all 20 stocks
- [ ] 4.7 No bad performance points (accountValue < $9,000)
- [ ] 4.8 Benchmark appears on chart but not in UI bubbles
- [ ] 4.9 Benchmark color is #6B7280 (gray)
- [ ] 4.10 ROI calculated correctly vs $10k starting value

### Test Data
- Query BenchmarkPosition table
- Calculate total value manually
- Compare with Agent.accountValue

---

## 5. API ENDPOINTS TESTING

### Test Objective
Verify all API routes return correct data

### Test Cases
- [ ] 5.1 GET /api/agents returns all 7 agents (6 AI + 1 benchmark)
- [ ] 5.2 GET /api/positions returns correct positions with agent data
- [ ] 5.3 GET /api/trades returns trades with proper side/action
- [ ] 5.4 GET /api/performance returns time-series data
- [ ] 5.5 GET /api/decisions returns decisions with reasoning
- [ ] 5.6 GET /api/cron/trading-cycle authenticates with CRON_SECRET
- [ ] 5.7 All APIs handle errors gracefully
- [ ] 5.8 All APIs return proper HTTP status codes
- [ ] 5.9 Data transformations match UI expectations
- [ ] 5.10 Response times are acceptable (<2s)

### Test Data
- Make API calls via curl
- Verify JSON structure
- Check response data accuracy

---

## 6. DATABASE INTEGRITY TESTING

### Test Objective
Verify database schema and data consistency

### Test Cases
- [ ] 6.1 All foreign keys are valid
- [ ] 6.2 No orphaned records
- [ ] 6.3 Timestamps are correct and sequential
- [ ] 6.4 Agent.accountValue matches calculated value
- [ ] 6.5 Position.currentPrice updates each cycle
- [ ] 6.6 Trade records match position history
- [ ] 6.7 PerformancePoint has entries for all agents
- [ ] 6.8 Decision records link to correct agents
- [ ] 6.9 No NULL values in required fields
- [ ] 6.10 Data types match schema definitions

### Test Data
- Run Prisma Studio
- Execute SQL queries
- Validate data relationships

---

## 7. UI DISPLAY ACCURACY TESTING

### Test Objective
Verify frontend displays data correctly

### Test Cases
- [ ] 7.1 Agent bubbles show correct account values
- [ ] 7.2 Agent bubbles show correct ROI percentages
- [ ] 7.3 Agent bubbles display correct colors
- [ ] 7.4 Performance chart renders all lines
- [ ] 7.5 Performance chart scales correctly
- [ ] 7.6 Benchmark line appears in gray
- [ ] 7.7 Trades tab shows recent trades
- [ ] 7.8 Positions tab shows active positions
- [ ] 7.9 Reasoning tab shows full history
- [ ] 7.10 Analysis tab shows portfolio breakdown
- [ ] 7.11 All tabs load without errors
- [ ] 7.12 Filtering by agent works correctly
- [ ] 7.13 Timestamps display in correct timezone
- [ ] 7.14 P&L colors (green/red) display correctly
- [ ] 7.15 Auto-refresh works (5-10s intervals)

### Test Data
- Open app in browser
- Take screenshots of each tab
- Verify numbers match API responses

---

## 8. GITHUB ACTIONS AUTOMATION TESTING

### Test Objective
Verify automated trading cycles work correctly

### Test Cases
- [ ] 8.1 Workflow file exists at correct path
- [ ] 8.2 CRON_SECRET is configured in GitHub
- [ ] 8.3 VERCEL_APP_URL is configured in GitHub
- [ ] 8.4 Workflow runs on schedule (0,30 14-21 * * 1-5)
- [ ] 8.5 Manual trigger works
- [ ] 8.6 Workflow authenticates successfully
- [ ] 8.7 Trading cycle completes without errors
- [ ] 8.8 Logs show successful execution
- [ ] 8.9 Database updates after workflow run
- [ ] 8.10 Workflow fails gracefully on errors

### Test Data
- Check GitHub Actions tab
- View workflow logs
- Verify database changes post-run

---

## 9. STOCK DATA ACCURACY TESTING

### Test Objective
Verify stock price data is accurate and up-to-date

### Test Cases
- [ ] 9.1 Yahoo Finance returns 19/20 stocks (BRK.B fails gracefully)
- [ ] 9.2 Stock prices are current (within 15 min)
- [ ] 9.3 Price changes calculated correctly
- [ ] 9.4 Technical indicators (MA7, MA30, MA90) accurate
- [ ] 9.5 52-week high/low tracked correctly
- [ ] 9.6 Volume data present and reasonable
- [ ] 9.7 News fetched for big movers (>2% change)
- [ ] 9.8 News sentiment analyzed correctly
- [ ] 9.9 StockPrice table updates each cycle
- [ ] 9.10 Historical data maintained (90 days)

### Test Data
- Compare with Yahoo Finance website
- Check StockPrice table
- Verify technical indicator calculations

---

## 10. ERROR HANDLING & EDGE CASES

### Test Objective
Verify system handles errors and edge cases gracefully

### Test Cases
- [ ] 10.1 System handles API rate limits
- [ ] 10.2 System handles network failures
- [ ] 10.3 System handles invalid AI responses
- [ ] 10.4 System prevents negative cash balances
- [ ] 10.5 System prevents over-leveraging
- [ ] 10.6 System handles missing stock data
- [ ] 10.7 System validates trade parameters
- [ ] 10.8 System logs errors appropriately
- [ ] 10.9 System recovers from failures
- [ ] 10.10 System handles concurrent requests

### Test Data
- Simulate error conditions
- Review error logs
- Test recovery mechanisms

---

## 11. PERFORMANCE & SCALABILITY TESTING

### Test Objective
Verify system performance is acceptable

### Test Cases
- [ ] 11.1 Trading cycle completes in <2 minutes
- [ ] 11.2 API responses return in <2 seconds
- [ ] 11.3 Database queries are optimized
- [ ] 11.4 Frontend loads in <3 seconds
- [ ] 11.5 Chart rendering is smooth
- [ ] 11.6 No memory leaks
- [ ] 11.7 Prisma connections pooled correctly
- [ ] 11.8 No N+1 query problems
- [ ] 11.9 Caching works where implemented
- [ ] 11.10 System handles historical data growth

### Test Data
- Measure execution times
- Profile database queries
- Monitor resource usage

---

## TEST EXECUTION SUMMARY

### Total Test Cases: 110
### Passed: TBD
### Failed: TBD
### Blocked: TBD
### Not Tested: TBD

---

## ISSUES DISCOVERED

### Critical Issues
(Issues that prevent core functionality)

### Major Issues
(Issues that significantly impact user experience)

### Minor Issues
(Issues that have minimal impact)

### Enhancement Requests
(Improvements identified during testing)

---

## TEST EXECUTION LOG

### Date: 2025-11-05
### Tester: Claude Code
### Environment: Production (polystocks.vercel.app)
### Database: Neon PostgreSQL

---

## SIGN-OFF

- [ ] All critical issues resolved
- [ ] All major issues resolved or documented
- [ ] Test evidence collected (screenshots, logs)
- [ ] System ready for production use
