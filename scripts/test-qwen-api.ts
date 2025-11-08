import axios from 'axios';

async function testQwen() {
  console.log('🧪 Testing Qwen API Integration\n');

  const apiKey = 'sk-2055d515bc374a7e9445defed9b32b54';

  // Test both endpoints to see which works
  const endpoints = [
    { name: 'China (Beijing)', url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation' },
    { name: 'International (Singapore)', url: 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation' }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n📍 Testing ${endpoint.name}...`);
    console.log(`URL: ${endpoint.url}`);

    try {
      const response = await axios.post(
        endpoint.url,
        {
          model: 'qwen-max',
          input: {
            messages: [
              {
                role: 'system',
                content: 'You are an expert stock trader. Always respond with valid JSON only.',
              },
              {
                role: 'user',
                content: 'Based on market conditions, should I buy TSLA stock? Respond in JSON format with: {"action":"BUY|HOLD","reasoning":"your detailed analysis (200+ chars)","confidence":0.85}'
              },
            ],
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 1000,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          timeout: 30000
        }
      );

      console.log('✅ SUCCESS!');
      console.log('Response:', JSON.stringify(response.data, null, 2));

      const text = response.data.output.text;
      console.log('\n📝 AI Response:');
      console.log(text);
      console.log('\n✅ This endpoint works!');

      return { success: true, endpoint: endpoint.name, url: endpoint.url };

    } catch (error: any) {
      console.log('❌ FAILED');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Error:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('Error:', error.message);
      }
    }
  }

  console.log('\n❌ Neither endpoint worked');
}

testQwen()
  .then((result) => {
    if (result) {
      console.log(`\n✅ Qwen API test complete - Use ${result.endpoint}`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
