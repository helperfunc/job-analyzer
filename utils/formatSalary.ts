// Utility function to format salary display
export function formatSalary(salary?: string, salaryMin?: number, salaryMax?: number): string {
  if (salary) {
    let formattedSalary = salary
    
    // Remove "+ Offers Equity" suffix
    const hadEquity = formattedSalary.includes('Offers Equity')
    formattedSalary = formattedSalary.replace(/\s*\+\s*Offers?\s*Equity/i, '').trim()
    
    // Handle currency conversions
    if (formattedSalary.includes('€') || formattedSalary.includes('EUR')) {
      // Euro to USD conversion (1 EUR = 1.1 USD)
      const euroMatch = formattedSalary.match(/€(\d{1,3}(?:[.,]\d{3})*)\s*[-–]\s*€(\d{1,3}(?:[.,]\d{3})*)/i)
      if (euroMatch) {
        const minStr = euroMatch[1].replace(/[.,]/g, '')
        const maxStr = euroMatch[2].replace(/[.,]/g, '')
        const minUSD = Math.round(parseInt(minStr) / 1000 * 1.1)
        const maxUSD = Math.round(parseInt(maxStr) / 1000 * 1.1)
        return `$${minUSD}K – $${maxUSD}K`
      }
    }
    
    if (formattedSalary.includes('£') || formattedSalary.includes('GBP')) {
      // GBP to USD conversion (1 GBP = 1.27 USD)
      const gbpMatch = formattedSalary.match(/£(\d{1,3}(?:[.,]\d{3})*)\s*[-–]\s*£(\d{1,3}(?:[.,]\d{3})*)/i)
      if (gbpMatch) {
        const minStr = gbpMatch[1].replace(/[.,]/g, '')
        const maxStr = gbpMatch[2].replace(/[.,]/g, '')
        const minUSD = Math.round(parseInt(minStr) / 1000 * 1.27)
        const maxUSD = Math.round(parseInt(maxStr) / 1000 * 1.27)
        return `$${minUSD}K – $${maxUSD}K`
      }
    }
    
    // If the original had "+ Offers Equity", it should remain a single value
    if (hadEquity) {
      // Return the cleaned single value
      return formattedSalary
    }
    
    // Check if this is already a range
    if (formattedSalary.includes('–') || formattedSalary.includes('-') || formattedSalary.includes('to')) {
      // Already a range, return as is
      return formattedSalary
    }
    
    // For single values without equity, check if we should convert to range
    // This is mainly for Anthropic jobs that show single values but have range data
    const singleValueMatch = formattedSalary.match(/^\$(\d+)K?$/i)
    if (singleValueMatch && salaryMin && salaryMax && salaryMin !== salaryMax) {
      // Show as range for Anthropic-style jobs
      return `$${salaryMin}K – $${salaryMax}K`
    }
    
    return formattedSalary
  }
  
  // Fallback to min/max if no salary string
  if (salaryMin && salaryMax) {
    return `$${salaryMin}K – $${salaryMax}K`
  }
  
  return ''
}