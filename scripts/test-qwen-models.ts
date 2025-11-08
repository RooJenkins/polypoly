import axios from 'axios';

async function testQwenModels() {
  console.log('🧪 Testing Different Qwen Models\n');

  const apiKey = 'sk-2055d515bc374a7e9445defed9b32b54';
  const endpoint = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

  const models = [
    'qwen-turbo',
    'qwen-plus',
    'qwen-max',
    'qwen-max-1201',
    'qwen-max-longcontext',
    'qwen2.5-72b-instruct',
    'qwen2.5-32b-instruct',
    'qwen2.5-14b-instruct',
    'qwen2.5-7b-instruct'
  ];

  console.log('Testing which models are activated in your account...\n');

  for (const model of models) {
    process.stdout.write(`Testing ${model}... `);

    try {
      const response = await axios.post(
        endpoint,
        {
          model: model,
          input: {
            messages: [
              {
                role: 'user',
                content: 'Say "Hello" in JSON: {"message":"Hello"}'
              },
            ],
          },
          parameters: {
            max_tokens: 50,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          timeout: 10000
        }
      );

      console.log('✅ WORKS!');
      console.log('  Response:', response.data.output.text);
      return { success: true, model };

    } catch (error: any) {
      if (error.response) {
        const code = error.response.data?.code || error.response.status;
        console.log(`❌ ${code}`);
      } else {
        console.log(`❌ ${error.message}`);
      }
    }
  }

  console.log('\n❌ No models are currently activated');
  console.log('\n📋 Next steps:');
  console.log('1. Go to: https://dashscope-intl.console.aliyun.com/');
  console.log('2. Navigate to Models or Dashboard');
  console.log('3. Activate at least one of these models:');
  console.log('   - qwen-turbo (fastest, cheapest)');
  console.log('   - qwen-plus (balanced)');
  console.log('   - qwen-max (best quality)');
}

testQwenModels()
  .then((result) => {
    if (result) {
      console.log(`\n✅ Found working model: ${result.model}`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
