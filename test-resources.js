const fetch = require('node-fetch');

async function testResourceCreation() {
  const baseUrl = 'http://localhost:3002';
  
  // Test creating a user resource
  console.log('Testing user resource creation...');
  try {
    const response = await fetch(`${baseUrl}/api/user/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3MzUwNTU0NDksImV4cCI6MTczNTA1OTA0OX0.v2xqLdyEqOTPXP0TlJF2mOLU5DFjfCeXJqLjrDkSfYU' // Test token
      },
      body: JSON.stringify({
        title: 'Test Resource from Script',
        description: 'This is a test resource created by script',
        resource_type: 'article',
        visibility: 'public',
        tags: ['test', 'debug']
      })
    });
    
    const data = await response.json();
    console.log('Create response:', response.status, data);
    
    if (data.success) {
      console.log('Resource created successfully:', data.resource);
      
      // Now check if it appears in dashboard
      console.log('\nChecking dashboard resources...');
      const dashboardResponse = await fetch(`${baseUrl}/api/user/user-resources`, {
        headers: {
          'Cookie': 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3MzUwNTU0NDksImV4cCI6MTczNTA1OTA0OX0.v2xqLdyEqOTPXP0TlJF2mOLU5DFjfCeXJqLjrDkSfYU'
        }
      });
      
      const dashboardData = await dashboardResponse.json();
      console.log('Dashboard response:', dashboardResponse.status, dashboardData);
      
      if (dashboardData.success) {
        const foundResource = dashboardData.resources.find(r => r.title === 'Test Resource from Script');
        if (foundResource) {
          console.log('✅ Resource found in dashboard!');
          console.log('Resource details:', foundResource);
        } else {
          console.log('❌ Resource NOT found in dashboard');
          console.log('Total resources in dashboard:', dashboardData.resources.length);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testResourceCreation();