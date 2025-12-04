/**
 * Script to test and compare different weight configurations for quick article scoring
 * 
 * Usage:
 *   npm run test:scoring-weights
 *   or
 *   tsx scripts/test-scoring-weights.ts
 * 
 * This script:
 * 1. Loads articles from database
 * 2. Tests different weight configurations
 * 3. Compares score distributions
 * 4. Generates a report
 */

import { storage } from "../server/storage";
import { scoreNewsItem } from "../server/ai-services/score-news";

interface WeightConfig {
  name: string;
  weights: {
    specificFacts: number;    // 0-35
    relevance: number;        // 0-25
    broadAudience: number;    // 0-20
    topicInterest: number;    // 0-20
  };
}

// Different weight configurations to test
const WEIGHT_CONFIGS: WeightConfig[] = [
  {
    name: "Current (Facts-heavy)",
    weights: {
      specificFacts: 35,
      relevance: 25,
      broadAudience: 20,
      topicInterest: 20,
    },
  },
  {
    name: "Balanced (Interest = Facts)",
    weights: {
      specificFacts: 30,
      relevance: 25,
      broadAudience: 20,
      topicInterest: 25,
    },
  },
  {
    name: "Interest-heavy",
    weights: {
      specificFacts: 25,
      relevance: 25,
      broadAudience: 20,
      topicInterest: 30,
    },
  },
];

interface ScoreResult {
  articleId: string;
  title: string;
  scores: Record<string, number>;
  comments: Record<string, string>;
}

interface ScoreDistribution {
  config: string;
  total: number;
  average: number;
  min: number;
  max: number;
  distribution: {
    excellent: number;  // 90-100
    high: number;       // 70-89
    moderate: number;   // 50-69
    low: number;        // 0-49
  };
}

/**
 * Get score category
 */
function getScoreCategory(score: number): 'excellent' | 'high' | 'moderate' | 'low' {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'high';
  if (score >= 50) return 'moderate';
  return 'low';
}

/**
 * Test scoring with different weight configurations
 */
async function testScoringWeights(userId: string, limit: number = 50) {
  console.log(`\n🧪 Testing scoring weights on ${limit} articles...\n`);

  // Get articles from database
  const allArticles = await storage.getRssItems(userId);
  
  // Limit and sort
  const articles = allArticles
    .filter(a => a.title && a.content)
    .sort((a, b) => {
      const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bDate - aDate;
    })
    .slice(0, limit);

  if (articles.length === 0) {
    console.error("❌ No articles found. Make sure you have articles in the database.");
    return;
  }

  console.log(`✅ Loaded ${articles.length} articles\n`);

  // Get API key
  const apiKey = await storage.getUserApiKey(userId, 'anthropic');
  if (!apiKey) {
    console.error("❌ Anthropic API key not found. Please add it in Settings.");
    return;
  }

  const results: ScoreResult[] = [];

  // Test each article with each configuration
  // Note: We'll use the current implementation and compare results
  // In real A/B test, we'd need to modify the prompt with different weights
  
  console.log("📊 Scoring articles...\n");
  
  for (const article of articles) {
    if (!article.title || !article.content) continue;

    const result: ScoreResult = {
      articleId: article.id,
      title: article.title.substring(0, 60),
      scores: {},
      comments: {},
    };

    // Score with current implementation
    try {
      const scoreResult = await scoreNewsItem(
        apiKey.decryptedKey,
        article.title,
        article.content || ''
      );
      
      result.scores['current'] = scoreResult.score;
      result.comments['current'] = scoreResult.comment;
    } catch (error: any) {
      console.error(`Error scoring article ${article.id}:`, error.message);
      continue;
    }

    results.push(result);

    // Progress indicator
    if (results.length % 10 === 0) {
      console.log(`  Processed ${results.length}/${articles.length} articles...`);
    }
  }

  console.log(`\n✅ Scored ${results.length} articles\n`);

  // Analyze results
  const distribution: ScoreDistribution = {
    config: 'current',
    total: results.length,
    average: 0,
    min: 100,
    max: 0,
    distribution: {
      excellent: 0,
      high: 0,
      moderate: 0,
      low: 0,
    },
  };

  let totalScore = 0;
  for (const result of results) {
    const score = result.scores['current'];
    totalScore += score;
    
    if (score < distribution.min) distribution.min = score;
    if (score > distribution.max) distribution.max = score;
    
    const category = getScoreCategory(score);
    distribution.distribution[category]++;
  }

  distribution.average = Math.round(totalScore / results.length);

  // Print report
  console.log("📈 SCORE DISTRIBUTION REPORT\n");
  console.log("=" .repeat(60));
  console.log(`Configuration: ${WEIGHT_CONFIGS[0].name}`);
  console.log(`Total Articles: ${distribution.total}`);
  console.log(`Average Score: ${distribution.average}/100`);
  console.log(`Score Range: ${distribution.min} - ${distribution.max}`);
  console.log("\nDistribution:");
  console.log(`  Excellent (90-100): ${distribution.distribution.excellent} (${Math.round(distribution.distribution.excellent / distribution.total * 100)}%)`);
  console.log(`  High (70-89):      ${distribution.distribution.high} (${Math.round(distribution.distribution.high / distribution.total * 100)}%)`);
  console.log(`  Moderate (50-69):  ${distribution.distribution.moderate} (${Math.round(distribution.distribution.moderate / distribution.total * 100)}%)`);
  console.log(`  Low (0-49):        ${distribution.distribution.low} (${Math.round(distribution.distribution.low / distribution.total * 100)}%)`);
  console.log("=" .repeat(60));

  // Sample results
  console.log("\n📋 SAMPLE RESULTS (Top 5 and Bottom 5):\n");
  
  const sorted = [...results].sort((a, b) => b.scores['current'] - a.scores['current']);
  
  console.log("Top 5:");
  sorted.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.scores['current']}/100] ${r.title}`);
    console.log(`     ${r.comments['current']}`);
  });
  
  console.log("\nBottom 5:");
  sorted.slice(-5).reverse().forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.scores['current']}/100] ${r.title}`);
    console.log(`     ${r.comments['current']}`);
  });

  // Recommendations
  console.log("\n💡 RECOMMENDATIONS:\n");
  
  const excellentPercent = distribution.distribution.excellent / distribution.total * 100;
  const highPercent = distribution.distribution.high / distribution.total * 100;
  const lowPercent = distribution.distribution.low / distribution.total * 100;

  if (excellentPercent > 20) {
    console.log("⚠️  Too many excellent scores (>20%). Consider making criteria stricter.");
  }
  
  if (lowPercent > 50) {
    console.log("⚠️  Too many low scores (>50%). Consider making criteria more lenient.");
  }
  
  if (distribution.average < 50) {
    console.log("⚠️  Average score is low (<50). Consider adjusting weights to favor interesting topics.");
  }
  
  if (distribution.average > 75) {
    console.log("⚠️  Average score is high (>75). Consider making criteria stricter.");
  }

  if (excellentPercent <= 20 && lowPercent <= 50 && distribution.average >= 50 && distribution.average <= 75) {
    console.log("✅ Score distribution looks balanced!");
  }

  console.log("\n📝 Next Steps:");
  console.log("  1. Review the distribution and sample results");
  console.log("  2. If needed, adjust weights in server/ai-services/score-news.ts");
  console.log("  3. Re-run this script to compare");
  console.log("  4. Consider A/B testing with users\n");
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0], 10) : 50;
  const userId = args[1] || 'default-user-id'; // In real usage, get from auth

  if (isNaN(limit) || limit <= 0) {
    console.error("❌ Invalid limit. Usage: tsx scripts/test-scoring-weights.ts [limit] [userId]");
    process.exit(1);
  }

  try {
    await testScoringWeights(userId, limit);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { testScoringWeights, WEIGHT_CONFIGS };

