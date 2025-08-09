// Test the improved skill detection logic
function testImprovedDetection() {
  console.log('🧪 Testing improved skill detection logic...')
  
  const testCases = [
    // React tests
    { text: 'react to changing requirements', expectedReact: false },
    { text: 'reactive systems architecture', expectedReact: false }, 
    { text: 'proactively react to incidents', expectedReact: false },
    { text: 'React.js framework experience', expectedReact: true },
    { text: 'building React components', expectedReact: true },
    { text: 'experience with React and frontend', expectedReact: true },
    { text: 'React experience required', expectedReact: true },
    
    // JavaScript tests
    { text: 'javascript experience required', expectedJS: false }, // No frontend context
    { text: 'frontend javascript development', expectedJS: true },
    { text: 'web javascript and node.js', expectedJS: true },
    { text: 'browser javascript experience', expectedJS: true },
    
    // HTML/CSS tests  
    { text: 'html documentation', expectedHTMLCSS: false },
    { text: 'frontend html and css', expectedHTMLCSS: true },
    { text: 'web development with html css', expectedHTMLCSS: true },
    { text: 'ui development html css', expectedHTMLCSS: true },
    
    // Git tests
    { text: 'digital transformation', expectedGit: false },
    { text: 'legitimate concerns', expectedGit: false },
    { text: 'git version control', expectedGit: true },
    { text: 'github repository management', expectedGit: true },
    
    // Machine Learning tests
    { text: 'machine learning solutions', expectedML: false }, // No experience context
    { text: 'machine learning experience required', expectedML: true },
    { text: 'ml background in deep learning', expectedML: true },
    { text: 'artificial intelligence knowledge', expectedML: true },
    
    // Cloud tests
    { text: 'aws costs', expectedAWS: false }, // No infrastructure context
    { text: 'aws cloud infrastructure', expectedAWS: true },
    { text: 'aws deployment experience', expectedAWS: true }
  ]
  
  console.log('\n🔍 Test Results:')
  testCases.forEach((testCase, i) => {
    const requirementsText = testCase.text.toLowerCase()
    
    // Test React
    if (testCase.expectedReact !== undefined) {
      const hasReactFramework = (requirementsText.includes('react.js') || 
                                requirementsText.includes('react js') ||
                                requirementsText.includes('reactjs') ||
                                (requirementsText.includes('react') && requirementsText.includes('component')) ||
                                (requirementsText.includes('react') && requirementsText.includes('framework')) ||
                                (requirementsText.includes('react') && requirementsText.includes('frontend')) ||
                                (requirementsText.includes('react') && requirementsText.includes('javascript')) ||
                                (requirementsText.includes('react') && requirementsText.includes('experience'))) &&
                               !requirementsText.includes('reactive') &&
                               !requirementsText.includes('reaction') &&
                               !requirementsText.includes('react to') &&
                               !requirementsText.includes('react quickly')
      
      const result = hasReactFramework === testCase.expectedReact ? '✅' : '❌'
      console.log(`${i+1}. React: "${testCase.text}" -> ${hasReactFramework} (expected ${testCase.expectedReact}) ${result}`)
    }
    
    // Test JavaScript
    if (testCase.expectedJS !== undefined) {
      const hasJavaScript = (requirementsText.includes('javascript') || requirementsText.includes(' js ')) && 
                            (requirementsText.includes('frontend') || requirementsText.includes('web') || requirementsText.includes('browser') || requirementsText.includes('node'))
      
      const result = hasJavaScript === testCase.expectedJS ? '✅' : '❌'
      console.log(`${i+1}. JavaScript: "${testCase.text}" -> ${hasJavaScript} (expected ${testCase.expectedJS}) ${result}`)
    }
    
    // Test HTML/CSS
    if (testCase.expectedHTMLCSS !== undefined) {
      const hasHTMLCSS = (requirementsText.includes('html') || requirementsText.includes('css')) && 
                         (requirementsText.includes('frontend') || requirementsText.includes('web') || requirementsText.includes('ui') || requirementsText.includes('website'))
      
      const result = hasHTMLCSS === testCase.expectedHTMLCSS ? '✅' : '❌'
      console.log(`${i+1}. HTML/CSS: "${testCase.text}" -> ${hasHTMLCSS} (expected ${testCase.expectedHTMLCSS}) ${result}`)
    }
    
    // Test Git
    if (testCase.expectedGit !== undefined) {
      const hasGit = requirementsText.includes('git') && 
                     !requirementsText.includes('digit') && 
                     !requirementsText.includes('digital') &&
                     (requirementsText.includes('version control') || requirementsText.includes('repository') || requirementsText.includes('github') || requirementsText.includes('gitlab'))
      
      const result = hasGit === testCase.expectedGit ? '✅' : '❌'
      console.log(`${i+1}. Git: "${testCase.text}" -> ${hasGit} (expected ${testCase.expectedGit}) ${result}`)
    }
    
    // Test Machine Learning
    if (testCase.expectedML !== undefined) {
      const hasMLSkills = (requirementsText.includes('machine learning') || requirementsText.includes(' ml ') || requirementsText.includes('artificial intelligence')) &&
                          (requirementsText.includes('experience') || requirementsText.includes('background') || requirementsText.includes('knowledge'))
      
      const result = hasMLSkills === testCase.expectedML ? '✅' : '❌'
      console.log(`${i+1}. ML: "${testCase.text}" -> ${hasMLSkills} (expected ${testCase.expectedML}) ${result}`)
    }
    
    // Test AWS
    if (testCase.expectedAWS !== undefined) {
      const hasAWS = requirementsText.includes('aws') || requirementsText.includes('amazon web services')
      const contextualAWS = hasAWS && (requirementsText.includes('cloud') || requirementsText.includes('infrastructure') || requirementsText.includes('deployment'))
      
      const result = contextualAWS === testCase.expectedAWS ? '✅' : '❌'
      console.log(`${i+1}. AWS: "${testCase.text}" -> ${contextualAWS} (expected ${testCase.expectedAWS}) ${result}`)
    }
  })
  
  console.log('\n✨ Improved logic should significantly reduce false positives!')
}

testImprovedDetection()