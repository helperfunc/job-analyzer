function testTitleFormatting() {
  // Test the title formatting regex
  const testTitles = [
    'Software Engineer, Real TimeApplied AI EngineeringSeattle',
    'Data ScientistData ScienceSan Francisco',
    'Account Director, Digital NativeSalesSingapore',
    'Analytics Engineer, Executive ReportingApplied AI EngineeringSan Francisco',
    'Customer Success ManagerTechnical SuccessSeoul, South Korea'
  ]
  
  console.log('🔍 Testing title formatting...')
  
  testTitles.forEach(title => {
    let cleanTitle = title
      // Add space before department/location info
      .replace(/([a-z])([A-Z][a-z])/g, '$1 $2')
      // Add space before city names
      .replace(/(Engineering|Products|Science|Infrastructure|Design|Operations|Success)([A-Z])/g, '$1 $2')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim()
    
    console.log(`Original: ${title}`)
    console.log(`Cleaned:  ${cleanTitle}`)
    console.log('---')
  })
  
  console.log('✅ Title formatting test complete')
}

testTitleFormatting()