import type { EnGuide } from "./guidesEn";

// The English cluster around the yield calculator at /knowledge/bond-yield-calculator (29 Oct 2026). Each guide answers
// one search question, shows its arithmetic and links back to the calculator. Examples were computed with lib/seo/calc.ts.
// Educational only: no recommendation, no live prices, no tax rates stated as advice.

const calc = (q = "") => `<p><strong>Try it:</strong> <a href="/knowledge/bond-yield-calculator${q}">open the bond yield calculator</a>. Enter price, coupon and maturity and read the result in a second. Nothing leaves your browser.</p>`;
const note = `<p><em>Educational information only, not a personal recommendation. Prices, yields and tax rules change: check the official source.</em></p>`;
const cta = `<p><strong>Next:</strong> <a href="/">see the 10 bonds the model selects for the maturity and return you choose</a>.</p>`;
const rev = [{ date: "2026-10-29", note: "Published" }];

export const EN_GUIDES_CALC: EnGuide[] = [
  {
    slug: "clean-vs-dirty-bond-price",
    published: "2026-10-29", updated: "2026-10-29", revisions: rev,
    group: "clean-dirty", section: "academy",
    title: "Clean price vs dirty price: what you actually pay for a bond",
    seoTitle: "Clean vs Dirty Bond Price: Accrued Interest Explained",
    metaDescription: "Clean price, dirty price and accrued interest explained with a worked example, plus why the price on your broker's screen is not the amount you pay.",
    primaryKeyword: "clean vs dirty bond price",
    relatedKeywords: ["accrued interest bond", "dirty price bond", "bond calculator"],
    bodyHtml: `
<p>You see a bond quoted at 98.5, you buy it, and the cash that leaves your account is higher than 98.5 per 100. Nobody has cheated you. You have just met the difference between the <strong>clean price</strong> and the <strong>dirty price</strong>, a distinction that exists because bonds are bought on every day of the year while coupons are paid on only a few.</p>
<h2 id="definitions">The definitions</h2>
<ul>
<li><strong>Clean price:</strong> the quoted price, without the interest earned since the last coupon date. It is the number on every bond screen.</li>
<li><strong>Accrued interest:</strong> the part of the next coupon earned by the seller for the days he or she held the bond.</li>
<li><strong>Dirty price</strong> (also called the full or gross price): clean price plus accrued interest. This is what you pay.</li>
</ul>
<p>The reason for quoting clean is practical. If screens showed dirty prices, a bond's price would climb every day and drop on every coupon date like a sawtooth, and the market's real moves would be buried in the interest calendar.</p>
<h2 id="example">A worked example</h2>
<p>A bond pays a 3.5% coupon twice a year, so 1.75 per 100 every six months. The last coupon was paid on 15 August. You buy on 15 December, four months later, at a clean price of 98.</p>
<p>The seller held the bond for four of the six months, so he or she has earned 4/6 of the coming coupon: about <strong>1.16</strong>. Your dirty price is 98 + 1.16 = <strong>99.16</strong>. On a face value of 10,000 you pay 9,916 rather than 9,800.</p>
<p>The money is not lost. On 15 February the issuer pays you the full 1.75, of which 1.16 simply gives back what you advanced to the seller. Accrued interest is a timing item, not a fee.</p>
<h2 id="yield">Which price goes into the yield?</h2>
<p>The yield to maturity is built on what you really pay and receive, so it uses the dirty price. Put the clean price in a spreadsheet and ignore the accrued interest and you will overstate or understate the yield, in small amounts most days and noticeably just before a coupon. A good bond calculator takes the clean price, works out the accrued interest from the dates and shows both prices, as <a href="/knowledge/bond-yield-calculator?p=98&amp;c=3.5&amp;f=2&amp;m=2031-02-15&amp;s=2026-12-15">this example</a> does.</p>
<p>The <strong>current yield</strong>, by contrast, is conventionally the coupon divided by the clean price. It is a rough guide only, as the guide on <a href="/knowledge/current-yield-vs-yield-to-maturity">current yield and yield to maturity</a> explains.</p>
<h2 id="tax">Accrued interest and tax</h2>
<p>In many countries the accrued interest you pay to the seller is treated separately for tax purposes, and the seller is taxed on the interest earned during the holding period. How this works depends on your country and the type of bond, so check with the tax authority or an adviser. The calculator does not model it.</p>
<h2 id="faq">Frequently asked questions</h2>
<h3>Is the dirty price always higher than the clean price?</h3>
<p>Yes, or equal. Accrued interest is zero on a coupon date and grows every day after, so the dirty price is at least the clean price. A zero-coupon bond has no accrued interest.</p>
<h3>Why is my bond invoice higher than the quoted price?</h3>
<p>Because the invoice shows the dirty price: the quoted clean price plus accrued interest, and any broker commission on top.</p>
<h3>What is the ex-dividend period of a bond?</h3>
<p>Some markets, such as UK gilts, stop paying the next coupon to the buyer shortly before the payment date. The buyer then gets a lower accrued interest, which can be negative.</p>
<h3>Does the clean price jump on the coupon date?</h3>
<p>No. That is the point of the clean price: when the coupon is paid, the accrued interest drops to zero and the dirty price falls by the coupon, while the clean price stays smooth.</p>
${calc("?p=98&c=3.5&f=2&m=2031-02-15&s=2026-12-15")}
${cta}
${note}`,
  },
  {
    slug: "current-yield-vs-yield-to-maturity",
    published: "2026-10-29", updated: "2026-10-29", revisions: rev,
    group: "current-yield", section: "academy",
    title: "Current yield vs yield to maturity: which one tells you more",
    seoTitle: "Current Yield vs Yield to Maturity (YTM) Explained",
    metaDescription: "Current yield vs yield to maturity: the formulas, a worked example with three prices, and when the two numbers agree and when they do not.",
    primaryKeyword: "current yield vs yield to maturity",
    relatedKeywords: ["current yield bond", "ytm vs current yield", "bond yield calculator"],
    bodyHtml: `
<p>Two numbers dominate any conversation about bond income, and they are routinely mistaken for each other. The <strong>current yield</strong> is the annual coupon divided by the price. The <strong>yield to maturity</strong> is the annual rate that equates everything you will receive with what you pay. One is a snapshot; the other is a film.</p>
<h2 id="current">Current yield: coupon over price</h2>
<p>The formula takes a line: <em>current yield = annual coupon / clean price</em>. A bond with a 4% coupon bought at 102 has a current yield of 4/102 = 3.92%. It is quick, needs no dates and is useful as a rough income figure: how much cash comes in each year per euro or dollar invested.</p>
<p>What it leaves out is everything about the end of the story. If you pay 102 for a bond that will be repaid at 100, you will lose two points at maturity, and the current yield does not notice.</p>
<h2 id="ytm">Yield to maturity: the whole path</h2>
<p>The yield to maturity (YTM) counts the coupons, the price you pay, the repayment and the timing of each payment. It is the rate <em>y</em> at which the discounted value of the cash flows equals the price. There is no closed formula, which is why <a href="/knowledge/bond-yield-calculator">a calculator</a> or a spreadsheet function does the trial and error. Our guide on <a href="/knowledge/yield-to-maturity">how to calculate yield to maturity</a> shows the steps by hand.</p>
<h2 id="three-prices">One bond, three prices</h2>
<p>Take a 4% semi-annual bond with 10 years to maturity, bought on a coupon date at three different prices:</p>
<table><thead><tr><th scope="col">Clean price</th><th scope="col">Current yield</th><th scope="col">Yield to maturity</th></tr></thead><tbody>
<tr><td>98.5</td><td>4.06%</td><td>4.19%</td></tr>
<tr><td>100</td><td>4.00%</td><td>4.00%</td></tr>
<tr><td>102</td><td>3.92%</td><td>3.76%</td></tr>
</tbody></table>
<p>Look at the pattern. At par the two agree. Below par the yield to maturity is higher, because the bond will rise to 100 and you pocket the difference. Above par it is lower, because the bond will fall to 100. The current yield moves in the opposite direction from what the price actually costs you at the end.</p>
<h2 id="when">When each one is useful</h2>
<ul>
<li><strong>Current yield</strong> suits a quick read of income, for instance when comparing bonds with similar prices and maturities, or when a bond has no meaningful maturity.</li>
<li><strong>Yield to maturity</strong> suits comparing bonds with different prices, coupons and lives, because it puts them on one annual rate.</li>
</ul>
<p>Neither says anything about credit risk. A very high yield of either kind is as often a warning as an opportunity.</p>
<h2 id="faq">Frequently asked questions</h2>
<h3>Is yield to maturity the same as the coupon rate?</h3>
<p>Only when the bond is bought at par on a coupon date. Otherwise they differ, sometimes by a lot.</p>
<h3>Which is higher, current yield or yield to maturity?</h3>
<p>For a bond below par, the yield to maturity is higher; above par, it is lower. At par they are equal.</p>
<h3>Why do professionals prefer yield to maturity?</h3>
<p>Because it accounts for the repayment and the timing of all cash flows, so it can be compared across bonds. It still assumes you hold to maturity and the issuer pays.</p>
<h3>Can the current yield be misleading?</h3>
<p>Yes, for bonds far from par and for long maturities, where the gap between price and repayment is material.</p>
${calc("?p=102&c=4&f=2")}
${cta}
${note}`,
  },
  {
    slug: "treasury-yield-calculator",
    published: "2026-10-29", updated: "2026-10-29", revisions: rev,
    group: "treasury-calculator", section: "government",
    title: "Treasury yield calculator: how to work out the yield on a T-note or T-bond",
    seoTitle: "Treasury Yield Calculator: T-Note and T-Bond Yield",
    metaDescription: "How to calculate the yield of a US Treasury note or bond from price, coupon and maturity, with a worked example and what the calculator leaves out.",
    primaryKeyword: "treasury yield calculator",
    relatedKeywords: ["treasury note yield calculator", "t-bond yield calculation", "yield to maturity calculator"],
    bodyHtml: `
<p>US Treasury notes and bonds are the most traded fixed-income securities in the world, and the number everyone quotes is their yield. When you see "the 10-year yield" on the news, it is the yield to maturity of a Treasury with about ten years left, worked out from its market price and fixed coupon. You can reproduce it yourself with three inputs.</p>
<h2 id="inputs">What you need</h2>
<ul>
<li><strong>Price:</strong> Treasuries are quoted as a percentage of face value, in fractions of 1/32. A price of 98-16 means 98 and 16/32, or 98.5. Convert it to decimals before typing.</li>
<li><strong>Coupon:</strong> the annual rate printed on the security, paid in two equal instalments every six months.</li>
<li><strong>Maturity date:</strong> from the security's description, with your purchase date as the settlement date.</li>
</ul>
<h2 id="example">A worked example</h2>
<p>Take a note with a 4.25% coupon and ten years to run, at a clean price of 98.5 (98-16) on a coupon date. It pays 2.125 every six months and 100 at maturity. The yield to maturity comes to <strong>4.44%</strong> against a current yield of 4.31%. The extra 0.13 is the gain of 1.5 points as the note rises to par, spread over ten years. <a href="/knowledge/bond-yield-calculator?p=98.5&amp;c=4.25&amp;f=2">Open this example in the calculator</a>.</p>
<h2 id="bond-equivalent">Why your number may differ from the quoted yield</h2>
<p>Treasury yields quoted by the market use the bond-equivalent convention: the yield for a six-month period, doubled. That is the convention the calculator uses, so a note at par on a coupon date yields exactly its coupon. Small differences remain because of day-count details, the exact settlement date and the coupon dates; a figure from your broker can differ in the second decimal.</p>
<h2 id="bills">Bills, TIPS and other Treasuries</h2>
<p>Treasury bills carry no coupon and are sold at a discount, with yields quoted on a discount or investment basis. TIPS pay a coupon on an inflation-adjusted principal. Floating-rate notes reset their coupon. A fixed-coupon calculator suits notes and bonds only. For the other types, see the guides on <a href="/knowledge/treasury-bills-notes-bonds">bills, notes and bonds</a> and <a href="/knowledge/tips-vs-treasury-bonds">TIPS</a>.</p>
<h2 id="tax">What about tax?</h2>
<p>Interest on Treasuries is generally subject to US federal income tax and exempt from state and local income tax, while rules for investors outside the US vary by country. The calculator lets you type your own rate on coupons and gains to see an after-tax figure. It is an estimate, not tax advice.</p>
<h2 id="faq">Frequently asked questions</h2>
<h3>How do I calculate the yield of a Treasury note?</h3>
<p>Convert the quoted price to decimals, enter the coupon, the payment frequency (twice a year) and the maturity date, and the calculator returns the yield to maturity.</p>
<h3>What is the difference between the coupon rate and the Treasury yield?</h3>
<p>The coupon is fixed when the note is issued. The yield changes with the price: if the price falls, the yield rises, and the reverse.</p>
<h3>What does a price of 98-16 mean?</h3>
<p>98 and 16/32, which is 98.5% of face value. Treasury prices are quoted in 32nds.</p>
<h3>Is the 10-year Treasury yield the same as a 10-year note's coupon?</h3>
<p>No. The headline figure is the yield to maturity of the current 10-year benchmark, which moves every day with the market price.</p>
${calc("?p=98.5&c=4.25&f=2")}
${cta}
${note}`,
  },
  {
    slug: "bond-yield-after-tax",
    published: "2026-10-29", updated: "2026-10-29", revisions: rev,
    group: "net-yield", section: "academy",
    title: "Bond yield after tax: how to calculate the net return",
    seoTitle: "Bond Yield After Tax: How to Calculate Net Return",
    metaDescription: "How tax changes a bond's yield: coupons, gains at maturity and a worked example showing the same bond at three tax rates, plus the limits of a simple model.",
    primaryKeyword: "bond yield after tax",
    relatedKeywords: ["net bond yield", "after tax yield to maturity", "bond tax calculator"],
    bodyHtml: `
<p>The yield printed on a screen is a gross number: a yield in a world without tax. What you keep is lower, and how much lower depends on your country, your type of account and the type of bond. The tax line in a calculator is not decoration, because two bonds with the same gross yield can leave you with quite different net returns.</p>
<h2 id="model">The simple model</h2>
<p>The calculator uses the plainest version that is still useful:</p>
<ul>
<li>each coupon is reduced by the tax rate you enter when it is paid;</li>
<li>at maturity, if you bought below 100, the difference (100 minus the purchase price) is taxed at the same rate;</li>
<li>a loss, if you bought above 100, is not offset against anything.</li>
</ul>
<p>Then it solves for the yield on the reduced cash flows. Everything else in the formula is unchanged.</p>
<h2 id="example">One bond, three tax rates</h2>
<p>A bond pays a 3% annual coupon, has five years to run and costs 95. Gross yield to maturity: <strong>4.13%</strong>.</p>
<table><thead><tr><th scope="col">Tax rate typed</th><th scope="col">Yield after tax</th><th scope="col">Cost of tax</th></tr></thead><tbody>
<tr><td>0%</td><td>4.13%</td><td>none</td></tr>
<tr><td>12.5%</td><td>3.62%</td><td>0.51 points</td></tr>
<tr><td>26%</td><td>3.07%</td><td>1.06 points</td></tr>
</tbody></table>
<p>These are examples of rates you might type, not advice on which applies to you. Check the official source for your country. The pattern is what matters: tax takes a roughly proportional slice, so the higher the gross yield, the more it costs in points. <a href="/knowledge/bond-yield-calculator?p=95&amp;c=3&amp;f=1&amp;t=26">Try it with your own rate</a>.</p>
<h2 id="same-gross">Same gross yield, different net yield</h2>
<p>Bonds often differ in how they are taxed: government and corporate bonds, domestic and foreign issuers, interest and capital gain. Where gains and coupons are taxed at different rates, a bond bought at a discount can beat a bond bought at par with the same gross yield, or the reverse. The simple model uses one rate, so for such cases run the calculation twice or ask a tax professional.</p>
<h2 id="costs">Costs are separate</h2>
<p>Broker commissions, custody fees and spreads also reduce your return, and the calculator does not include them. On a small trade or a short maturity they can matter more than tax; the broker pages on the site compare typical costs.</p>
<h2 id="faq">Frequently asked questions</h2>
<h3>How do I calculate bond yield after tax?</h3>
<p>Reduce each coupon by the tax rate, tax the gain at maturity at the applicable rate, and solve for the yield on the resulting cash flows. A bond calculator with a tax field does this for you.</p>
<h3>Is the net yield simply the gross yield times one minus the tax rate?</h3>
<p>Almost, for a bond bought at par. For a bond at a discount or premium the result differs, because the gain or loss at maturity is taxed at the end rather than each year.</p>
<h3>Are bond gains taxed differently from coupons?</h3>
<p>In many countries yes. The calculator uses one rate for both, so use it as an approximation.</p>
<h3>Does this replace tax advice?</h3>
<p>No. Rules depend on your country, your account and your circumstances, and they change.</p>
${calc("?p=95&c=3&f=1&t=26")}
${cta}
${note}`,
  },
  {
    slug: "bond-yield-calculator-excel",
    published: "2026-10-29", updated: "2026-10-29", revisions: rev,
    group: "yield-excel", section: "academy",
    title: "Bond yield in Excel and Google Sheets: the YIELD function step by step",
    seoTitle: "Bond Yield in Excel: YIELD and IRR Step by Step",
    metaDescription: "How to calculate a bond's yield to maturity in Excel or Google Sheets with the YIELD function, with the argument list, an example and common mistakes.",
    primaryKeyword: "bond yield calculator excel",
    relatedKeywords: ["excel yield function", "ytm excel", "bond yield formula excel"],
    bodyHtml: `
<p>Excel has a function for this, which is just as well, since a bond's yield to maturity can only be found by trial and error. The function is called <strong>YIELD</strong>, it also exists in Google Sheets, and it is used by people who would rather not be woken up by an equation. If you only need one answer, <a href="/knowledge/bond-yield-calculator">the online calculator</a> gives it in a second; if you need a hundred, here is how to set up the sheet.</p>
<h2 id="syntax">The syntax</h2>
<p><code>=YIELD(settlement, maturity, rate, pr, redemption, frequency, [basis])</code></p>
<ul>
<li><strong>settlement:</strong> the date you buy, as a real date, not text.</li>
<li><strong>maturity:</strong> the repayment date.</li>
<li><strong>rate:</strong> the annual coupon as a decimal (0.0425 for 4.25%).</li>
<li><strong>pr:</strong> the clean price per 100 of face value.</li>
<li><strong>redemption:</strong> the repayment per 100, normally 100.</li>
<li><strong>frequency:</strong> coupons per year: 1, 2 or 4.</li>
<li><strong>basis:</strong> the day count; 0 is the US 30/360, 1 is actual/actual.</li>
</ul>
<h2 id="example">An example you can check</h2>
<p>A note with a 4.25% semi-annual coupon, bought at 98.5 on 15 November 2026 and repaid on 15 November 2036:</p>
<p><code>=YIELD(DATE(2026,11,15), DATE(2036,11,15), 0.0425, 98.5, 100, 2, 1)</code></p>
<p>The answer is about 0.0444, or 4.44%. The calculator, on the same inputs, returns the same figure: <a href="/knowledge/bond-yield-calculator?p=98.5&amp;c=4.25&amp;f=2">open it</a> and compare. The function gives the yield with the coupons compounding at the coupon frequency, the market convention.</p>
<h2 id="irr">The alternative: IRR</h2>
<p>If the bond's cash flows are irregular, or you want to see them, list them in a column: the negative price (plus accrued interest) at the start, each coupon, and the coupon plus repayment at the end. <code>=IRR(range)</code> returns the rate per period; multiply it by the number of coupons a year to quote it as an annual yield. For payments on irregular dates use <code>XIRR</code>, which returns an effective annual rate and will differ a little from the quoted yield.</p>
<h2 id="mistakes">Common mistakes</h2>
<ul>
<li><strong>Dates typed as text.</strong> Excel returns an error. Use DATE() or format the cells as dates.</li>
<li><strong>Coupon as 4.25 rather than 0.0425.</strong> The function does not know you meant percent.</li>
<li><strong>Dirty price in the pr argument.</strong> YIELD expects the clean price and handles accrued interest itself.</li>
<li><strong>Wrong frequency.</strong> A gilt or a Treasury is 2, a Bund is 1.</li>
</ul>
<h2 id="after-tax">After tax</h2>
<p>The function has no tax argument. A workaround is to apply the tax to the coupon and the gain yourself and use IRR on the reduced flows, or use the calculator, which does it with a field for your rate.</p>
<h2 id="faq">Frequently asked questions</h2>
<h3>Which Excel function calculates a bond's yield to maturity?</h3>
<p>YIELD, with settlement, maturity, rate, price, redemption, frequency and an optional day-count basis. The same function exists in Google Sheets.</p>
<h3>Why does YIELD return an error?</h3>
<p>Usually because a date is text, the settlement date is after maturity, or the coupon is entered as a whole number rather than a decimal.</p>
<h3>Is the YIELD result the same as the yield on my broker's screen?</h3>
<p>It should match to the first decimal; the second can differ with the day count basis and the exact coupon dates.</p>
<h3>Can I calculate a bond's yield without Excel?</h3>
<p>Yes. An online bond yield calculator does the same calculation from price, coupon and maturity.</p>
${calc("?p=98.5&c=4.25&f=2")}
${cta}
${note}`,
  },
];
