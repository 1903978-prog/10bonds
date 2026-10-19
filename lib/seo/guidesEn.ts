import type { KcSection } from "./knowledge";

// English versions of the published guides, for the international (English) Knowledge Center at /knowledge.
// Translated from the Italian originals (and Livio's own article); `group` matches the translation group of the
// Italian/French/German versions so the pages point to each other with hreflang.

export type EnGuide = { slug: string; group: string; section: KcSection; title: string; seoTitle: string; metaDescription: string; primaryKeyword: string; bodyHtml: string; published?: string };

export const EN_GUIDES: EnGuide[] = [
  {
    slug: "yield-to-maturity",
    group: "ytm",
    section: "academy",
    title: "How to calculate a bond's yield to maturity",
    seoTitle: "How to calculate yield to maturity (YTM)",
    metaDescription: "What a bond's yield to maturity (YTM) is, how to calculate it with a step-by-step example, and which assumptions sit behind the number.",
    primaryKeyword: "yield to maturity",
    bodyHtml: `
<p>The <strong>yield to maturity</strong> (YTM) is the number most widely used to compare bonds. It tells you the annual return you would earn by buying a bond today at its market price and holding it until maturity, provided the issuer pays every coupon and repays the capital.</p>
<p>Because it folds the price you pay, the coupons you receive and the final repayment into a single annual rate, it lets you put bonds with very different coupons, prices and maturities side by side. That is also why it needs to be read with care: it is the result of a calculation built on a few assumptions, and each of them matters.</p>
<h2 id="coupon-and-yield">Coupon and yield are not the same thing</h2>
<p>The <strong>coupon</strong> is the fixed interest set when the bond is issued, calculated on the face value (usually 100). The <strong>price</strong>, on the other hand, changes every day. If you buy below 100 you also gain the difference up to repayment; if you buy above 100 that difference is a loss. The yield to maturity combines the two: the coupons and the difference between the price paid and the amount repaid.</p>
<p>This is why two bonds with the same 3% coupon can have very different yields to maturity: it depends on how much they cost today and on how long is left until they mature.</p>
<p>A simple way to keep the distinction in mind: the coupon is a property of the bond and never changes, while the yield to maturity is a property of the price you pay today, so it changes whenever the price does.</p>
<h2 id="formula">The formula</h2>
<p>The yield to maturity is the rate <em>y</em> that makes today's price equal to the present value of all future cash flows:</p>
<p><em>Price = C/(1+y) + C/(1+y)² + … + (C+100)/(1+y)ⁿ</em></p>
<p>where <em>C</em> is the annual coupon and <em>n</em> the number of years to maturity. There is no direct solution: it is found by trial and error, which is what spreadsheets do with functions such as <em>IRR</em> or <em>YIELD</em>.</p>
<p>Each term of the formula discounts one payment back to today: the further away a payment is, the more it is discounted. The last term includes both the final coupon and the repayment of the face value.</p>
<h2 id="example">A step-by-step example</h2>
<p>Take a bond with a 3% annual coupon, maturing in 5 years, priced at 95.</p>
<ul>
<li>Every year you receive 3 euros of coupon for every 100 of face value.</li>
<li>At maturity you receive 100, which is 5 euros more than you paid.</li>
<li>The rate that makes 95 equal to the present value of these cash flows is about <strong>4.13%</strong> a year.</li>
</ul>
<p>There is also an <strong>approximate formula</strong>, useful for a quick mental calculation:</p>
<p><em>YTM ≈ (C + (100 − Price) / n) / ((100 + Price) / 2)</em></p>
<p>With the numbers from the example: (3 + 5/5) / 97.5 = 4.10%. Very close to the exact value.</p>
<p>The approximation spreads the gain from the discount evenly over the remaining years and divides by the average of the price paid and the amount repaid. It works well for prices close to 100 and becomes less precise for deep discounts or very long maturities.</p>
<h2 id="assumptions">The assumptions you need to know</h2>
<p>The yield to maturity is an estimate, not a promise. It only holds if:</p>
<ul>
<li><strong>you hold the bond until maturity</strong>: if you sell earlier, the result depends on the price at that moment;</li>
<li><strong>the issuer pays everything</strong>: in the event of default you lose coupons and part of the capital (see the guide on <a href="/knowledge/bond-credit-risk">credit risk</a>);</li>
<li><strong>you reinvest the coupons at the same rate</strong>: in reality the reinvestment rate changes;</li>
<li><strong>the bond is not repaid early</strong>: for callable bonds the yield to the first call date also matters.</li>
</ul>
<h2 id="gross-and-net">Gross and net yield: the Italian rules</h2>
<p>The yields shown on 10BONDS are <strong>gross</strong>. In Italy, interest and capital gains on bonds are normally subject to a 26% substitute tax, reduced to 12.5% for Italian government bonds, for those of countries that exchange information with Italy and for supranational issuers. The net yield is therefore lower: check with your bank or tax adviser for your own situation.</p>
<p>If you are taxed in another country, the rates and rules will be different, but the principle is the same: compare bonds on the yield you would actually keep after tax and costs.</p>
<h2 id="how-to-use-it">How to use the yield to maturity</h2>
<p>Always compare the yield together with two other figures: the <a href="/knowledge/bond-duration">duration</a>, which measures how much the price reacts to interest rates, and the rating, which measures the issuer's risk. A higher yield almost always means more risk.</p>
<p>To see real yields today, use the <a href="/">bond finder</a>: choose a duration and a target yield, for example around 4% or a duration of about 5 years, and look at the bonds closest to it.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: choose a duration and a target yield and see the 10 closest bonds.</p>
`,
  },
  {
    slug: "bond-duration",
    group: "duration",
    section: "risk",
    title: "Bond duration: what it is and how to use it",
    seoTitle: "Bond duration: what it is and how to use it",
    metaDescription: "Duration measures how much a bond's price changes when interest rates change. The difference between Macaulay and modified duration, with examples.",
    primaryKeyword: "bond duration",
    bodyHtml: `
<p><strong>Duration</strong> is the second number, after the yield, to look at before choosing a bond. It answers a simple question: if interest rates change, how much does the price of my bond change?</p>
<p>Two bonds can offer the same yield and still behave very differently when the market moves. Duration is what tells them apart, which is why it belongs next to the yield in every comparison.</p>
<h2 id="two-durations">Two kinds of duration</h2>
<p><strong>Macaulay duration</strong> is the average maturity of the bond's cash flows (coupons and repayment), weighted by their present value. It is measured in years and is always equal to or shorter than the remaining life of the bond: the coupons arrive before the final repayment.</p>
<p><strong>Modified duration</strong> is derived from the first (you divide it by 1 + yield) and directly measures the sensitivity of the price to interest rates. It is the one 10BONDS uses and the one you find in our sliders.</p>
<p>In everyday use, when people say "duration" they usually mean the modified one, because it translates directly into a percentage change in price.</p>
<h2 id="rule-of-thumb">The rule of thumb</h2>
<p>With a modified duration of <em>D</em> years, if market yields rise by one percentage point the price falls by about <em>D</em>%. If they fall by one point, the price rises by about <em>D</em>%.</p>
<ul>
<li>Duration 2: a 1% rise in rates costs about 2% of the price.</li>
<li>Duration 5: about 5%.</li>
<li>Duration 10: about 10%.</li>
</ul>
<p>Example: a 3% bond maturing in 5 years with a yield of 4.13% has a Macaulay duration of about 4.7 years and a modified duration of about 4.5. The rule works well for small changes; for large changes <strong>convexity</strong> comes into play, which makes price rises a little larger than price falls.</p>
<p>The rule works in both directions, so duration is not only a measure of risk: a long-duration bond loses more when rates rise, but it also gains more when rates fall.</p>
<h2 id="what-changes-it">What lengthens or shortens duration</h2>
<ul>
<li><strong>Maturity</strong>: the further away it is, the longer the duration.</li>
<li><strong>Coupon</strong>: high coupons return more money earlier, so they shorten the duration. A zero-coupon bond has a Macaulay duration equal to its remaining life.</li>
<li><strong>Level of yields</strong>: higher yields shorten the duration slightly.</li>
</ul>
<p>This is why two bonds with the same maturity can have different durations: the one with the higher coupon pays back more of your money along the way, and is therefore a little less exposed to changes in rates.</p>
<h2 id="horizon">Duration and investment horizon</h2>
<p>If you already know when you will need the money, choosing a duration close to that horizon limits the risk: if rates rise, the price falls but you reinvest the coupons at higher rates, and the two effects tend to offset each other. If the horizon is short and the duration long, a rise in rates may force you to sell at a loss.</p>
<p>You can compare bonds by duration band, for example around 2 years, around 5 years or around 10 years, using the duration slider in the <a href="/">bond finder</a>.</p>
<h2 id="limits">What duration does not measure</h2>
<p>Duration measures only <strong>interest rate risk</strong>. It says nothing about the strength of the issuer: for that you need the rating and the spread, explained in the guide on <a href="/knowledge/bond-credit-risk">credit risk</a>. And it does not work well for floating-rate or callable bonds, which react to interest rates in a different way.</p>
<p>Duration is also a snapshot: as time passes and as yields move, it changes. A bond bought with a duration of 5 will have a shorter duration a year later.</p>
<p>Read it together with the <a href="/knowledge/yield-to-maturity">yield to maturity</a> and the rating, and you have the three numbers that describe most of what matters in a bond.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: set the duration you need and the yield you are looking for.</p>
`,
  },
  {
    slug: "investment-grade-bonds",
    group: "ig",
    section: "risk",
    title: "Investment grade bonds: what they are and what they yield",
    seoTitle: "Investment grade bonds: what they are",
    metaDescription: "What investment grade means, how to read S&P, Moody's and Fitch ratings, and what changes between BBB- and BB+ for bond investors.",
    primaryKeyword: "investment grade bonds",
    bodyHtml: `
<p><strong>Investment grade</strong> bonds are those that the rating agencies judge to have a low risk of default. It is the most important boundary in the bond market: many funds and institutional investors can only buy bonds above this threshold.</p>
<p>Knowing where that boundary lies, and what happens when an issuer crosses it, helps you read the yields you see and understand why two bonds that look similar can be priced very differently.</p>
<p>This guide explains the rating scale used by the three main agencies, what a rating does and does not tell you, why the lowest investment grade step attracts so much attention, and how 10BONDS handles bonds on which the agencies disagree.</p>
<h2 id="rating-scale">The rating scale</h2>
<p>The three main agencies use similar scales. These are investment grade:</p>
<table>
<thead><tr><th scope="col">S&amp;P and Fitch</th><th scope="col">Moody's</th><th scope="col">Assessment</th></tr></thead>
<tbody>
<tr><td>AAA</td><td>Aaa</td><td>Highest quality</td></tr>
<tr><td>AA+, AA, AA-</td><td>Aa1, Aa2, Aa3</td><td>Very high quality</td></tr>
<tr><td>A+, A, A-</td><td>A1, A2, A3</td><td>High quality</td></tr>
<tr><td>BBB+, BBB, BBB-</td><td>Baa1, Baa2, Baa3</td><td>Adequate quality</td></tr>
</tbody>
</table>
<p>From BB+ (Ba1 for Moody's) downwards we speak of <a href="/knowledge/high-yield-bonds">high yield</a>, also called "speculative".</p>
<p>The plus and minus signs (or the numbers 1, 2 and 3 for Moody's) refine the position within each band: A+ is a little stronger than A, which is a little stronger than A-.</p>
<h2 id="what-a-rating-says">What a rating really says</h2>
<p>A rating is the agency's opinion of the issuer's ability to pay coupons and capital. It is not a guarantee and it is not a recommendation to buy. Historically, defaults among investment grade issuers have been much rarer than among high yield issuers, but not impossible. Ratings can also change: an issuer can be downgraded while you hold the bond in your portfolio.</p>
<p>For this reason it is worth treating the rating as a starting point rather than a final verdict, and looking at it together with the spread and the structure of the bond, as explained in the guide on <a href="/knowledge/bond-credit-risk">credit risk</a>.</p>
<h2 id="bbb-threshold">Why the BBB- threshold matters so much</h2>
<p>When an issuer falls from BBB- to BB+ it becomes a <strong>fallen angel</strong>. Many investors are obliged to sell, and the price can fall further than the deterioration in credit alone would justify. This is why BBB- bonds tend to yield a little more than A bonds: the market prices in the risk of crossing the threshold.</p>
<p>The forced selling comes from rules, not from a sudden change in the company itself: funds whose mandate allows only investment grade must reduce or sell their holdings, whatever they think of the issuer.</p>
<h2 id="yield">What they yield</h2>
<p>The yield of an investment grade bond depends on market rates, on the <a href="/knowledge/bond-duration">duration</a> and on the rating. As a rule, for the same duration, the lower the rating the higher the yield. You can see today's values in the <a href="/">bond finder</a>, updated every day.</p>
<p>When you compare, keep the duration fixed first and then look at how the yield changes as the rating goes down: the gap between bands is the extra return the market pays for the extra risk.</p>
<h2 id="agencies-disagree">When the agencies disagree</h2>
<p>It happens that a bond is BBB- for one agency and BB+ for another. On 10BONDS we use the resolved rating supplied with the data when available, otherwise S&amp;P's, then Moody's, then Fitch's. Bonds without a rating do not appear in our lists. The details are in our methodology.</p>
<p>Split ratings are most common close to the investment grade boundary, which is exactly where the difference matters most. If you hold such a bond, it is worth knowing which rating your bank or fund uses.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: choose the minimum rating with the third slider and look at the 10 bonds.</p>
`,
  },
  {
    slug: "bond-credit-risk",
    group: "credit",
    section: "risk",
    title: "Bond credit risk: how to assess it",
    seoTitle: "Bond credit risk: how to assess it",
    metaDescription: "Credit risk is the chance that the issuer does not pay. How to read it through ratings, spreads, seniority and diversification.",
    primaryKeyword: "bond credit risk",
    bodyHtml: `
<p>Anyone who buys a bond is lending money to the issuer. <strong>Credit risk</strong> is the possibility that the issuer does not pay the coupons or does not repay the capital, in full or in part. It is the main risk of corporate bonds, and the reason why some yield much more than others.</p>
<p>No single number captures it completely. Ratings, spreads and the structure of the bond each show a different side of the same risk, and diversification is what keeps a single problem from becoming a large loss.</p>
<p>Unlike interest rate risk, which affects all bonds of a similar duration in much the same way, credit risk is specific to each issuer. That is what makes it worth studying bond by bond, and what makes spreading your money across issuers so effective.</p>
<h2 id="rating">The first indicator: the rating</h2>
<p>Rating agencies summarise credit risk in a letter, from AAA to D. The most important division is between <a href="/knowledge/investment-grade-bonds">investment grade</a> (down to BBB-) and <a href="/knowledge/high-yield-bonds">high yield</a> (from BB+ downwards). The rating is useful but often lags behind events: it should be used as a starting point.</p>
<p>A rating reflects the agency's view at the time of its last review. Between one review and the next, the situation of the issuer can change, and the market usually reacts faster than the agencies.</p>
<h2 id="spread">The second indicator: the spread</h2>
<p>The <strong>spread</strong> is the difference between the bond's yield and that of a security considered almost risk-free with the same maturity, for example a German government bond. A wide spread means the market is asking for more compensation for that issuer's risk. If an issuer's spread rises much more than that of competitors with the same rating, the market is signalling a problem.</p>
<p>Because it moves every day with prices, the spread is the most up-to-date reading of how the market judges an issuer. Comparing it with issuers of similar rating and maturity is what makes it informative.</p>
<h2 id="loss">How much you lose in a default</h2>
<p>A default does not necessarily mean losing everything. How much is recovered depends on:</p>
<ul>
<li><strong>seniority</strong>: <em>senior</em> bonds are repaid before <em>subordinated</em> ones; the latter yield more precisely because they recover less;</li>
<li><strong>collateral</strong>: bonds secured by specific assets (for example covered bonds) recover more;</li>
<li><strong>the issuer's sector and assets</strong>.</li>
</ul>
<p>For banks in the European Union there is also <strong>bail-in</strong>: in a crisis, the authorities can impose losses on bondholders, starting with subordinated securities.</p>
<p>This is why two bonds from the same issuer can carry different risks: a senior bond and a subordinated bond of the same bank sit in different places in the queue if things go wrong.</p>
<h2 id="diversify">The simplest remedy: diversify</h2>
<p>The risk of a single issuer is reduced by spreading capital across several issuers, sectors and countries. This is why 10BONDS lists include <strong>only one bond per issuer</strong>: ten bonds are ten different issuers.</p>
<p>Diversification does not remove credit risk, but it changes its shape: instead of one default being able to wipe out a large part of the portfolio, each issuer accounts for only a fraction of it.</p>
<h2 id="yield-and-risk">Yield and risk go together</h2>
<p>For the same <a href="/knowledge/bond-duration">duration</a>, a higher yield is almost always the price of higher credit risk. When a bond yields much more than others with the same rating, ask yourself why. Compare, for example, investment grade bonds with high yield bonds in the <a href="/">bond finder</a>.</p>
<p>The <a href="/knowledge/yield-to-maturity">yield to maturity</a> itself assumes that the issuer pays everything: the higher the credit risk, the less certain that assumption becomes.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: use the rating slider to choose how much credit risk you accept.</p>
`,
  },
  {
    slug: "high-yield-bonds",
    group: "hy",
    section: "risk",
    title: "High yield bonds: risks and opportunities",
    seoTitle: "High yield bonds: risks and opportunities",
    metaDescription: "What high yield bonds are, why they pay more, what risks they carry and how to compare them with other bonds.",
    primaryKeyword: "high yield bonds",
    bodyHtml: `
<p><strong>High yield</strong> bonds are issued by companies rated below BBB- (Baa3 for Moody's). They pay higher coupons and yields because investors take on a greater risk that the issuer will not be able to pay.</p>
<p>They are sometimes called "speculative grade" bonds. The higher return is real, but it comes with risks that do not show up in the yield figure itself, and it is worth understanding them before comparing numbers.</p>
<p>This guide explains where the extra yield comes from, the main risks that come with it, why the bands within high yield differ so much from each other, and what to check before comparing one bond with another.</p>
<h2 id="why-they-yield-more">Why they yield more</h2>
<p>The extra yield over government bonds, the <strong>spread</strong>, compensates for three things: the probability of default, the expected loss in the event of default, and the lower ease of selling the bond. When the economy slows, high yield spreads widen quickly and prices fall: these bonds behave partly like shares.</p>
<p>This means that the yield you see is not a measure of what you will earn but of what the market asks to be paid for the risk. Part of that extra yield is, on average, used up by the defaults that do occur.</p>
<h2 id="main-risks">The main risks</h2>
<ul>
<li><strong>Default</strong>: this is the biggest risk. A single default can wipe out years of coupons if the portfolio is poorly diversified.</li>
<li><strong>Liquidity</strong>: many issues are small and rarely traded; the difference between buying and selling price can be wide.</li>
<li><strong>Early redemption</strong>: many high yield bonds are callable; if rates fall the issuer can repay them and the expected yield is not achieved.</li>
<li><strong>Downgrade</strong>: a further cut in the rating makes the price fall.</li>
</ul>
<p>These risks often show up together: in a downturn, downgrades become more frequent, spreads widen and the bonds become harder to sell, all at the same time.</p>
<h2 id="bb-and-b">Not all high yield is the same</h2>
<p>The BB band is the closest to investment grade and has historically had far fewer defaults than the B and CCC bands. On 10BONDS the lowest rating you can select is BB: the more speculative bands and unrated bonds never appear.</p>
<p>The step from <a href="/knowledge/investment-grade-bonds">investment grade</a> to BB is the first one down the scale, and it is a very different step from the one between B and CCC.</p>
<h2 id="how-to-compare">How to compare them</h2>
<p>Before the yield, look at the rating, the <a href="/knowledge/bond-duration">duration</a> and the seniority. Compare the spread with that of similar issuers: if a bond yields much more than others with the same rating, the market sees a specific risk. The guide on <a href="/knowledge/bond-credit-risk">credit risk</a> explains how to read it.</p>
<p>The <a href="/">bond finder</a> shows the highest yields every day, one bond per issuer. For a comparison with stronger issuers, look at bonds with a yield of around 5% and a higher minimum rating.</p>
<p>Keep in mind that a callable bond may be repaid before maturity: for these bonds the <a href="/knowledge/yield-to-maturity">yield to maturity</a> is not the only figure that counts.</p>
<h2 id="how-much-weight">How much weight to give to high yield</h2>
<p>It depends on your situation, your objectives and how much risk you can bear: it is a choice to make with a licensed adviser. In general one rule applies: the higher the yield you are looking for, the more important it is to diversify across many issuers.</p>
<p>Diversification matters more here than anywhere else in the bond market, because the risk of a single issuer is larger and a single default weighs more on the result.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: move the rating slider down to BB and compare the yields.</p>
`,
  },
  {
    slug: "european-government-bonds",
    group: "gov",
    section: "government",
    title: "European government bonds: BTP, OAT and Bund explained",
    seoTitle: "European government bonds: BTP, OAT and Bund",
    metaDescription: "Italian BTPs, French OATs and German Bunds explained: how they work, coupons, spreads, risks, taxation and how to compare their yields.",
    primaryKeyword: "european government bonds",
    bodyHtml: `
<p>Governments finance themselves by issuing bonds. In the euro area the three largest markets are Italy's <strong>BTPs</strong>, France's <strong>OATs</strong> and Germany's <strong>Bunds</strong>. They are a reference point for many savers and for the market as a whole: the yields of German federal securities are the benchmark against which almost all other euro bonds are measured, and the well-known <em>spread</em> is the difference between the yield of the 10-year BTP and that of the German Bund with the same maturity.</p>
<h2 id="italy-btp">Italy: how a BTP works</h2>
<p><strong>BTPs</strong>, Buoni del Tesoro Poliennali, are the securities with which the Italian state finances itself over the medium and long term. A classic BTP pays a <strong>fixed coupon every six months</strong> and repays its face value at maturity, which usually ranges from 3 to 30 years. It can be bought at issue, through the auctions of the Ministry of Economy and Finance, or at any time on the secondary market (Borsa Italiana's MOT) through your bank or a broker. On the market the price changes every day: that is why the <a href="/knowledge/yield-to-maturity">yield to maturity</a> differs from the coupon.</p>
<h3 id="italy-family">The family of Italian government securities</h3>
<ul>
<li><strong>BOT</strong>: maturity up to one year, no coupon; the return is the difference between the purchase price and the repayment.</li>
<li><strong>CTZ</strong>: short-term zero-coupon securities.</li>
<li><strong>CCT</strong>: floating coupon linked to short-term market rates.</li>
<li><strong>BTP Italia</strong>: indexed to Italian inflation (the FOI index excluding tobacco), designed for savers, with a loyalty bonus in the issues that provide for one.</li>
<li><strong>BTP Valore</strong>: reserved for individual savers during the placement period, with coupons that rise over time and a final bonus for those who hold it to maturity.</li>
</ul>
<p>The terms of BTP Italia and BTP Valore change from one issue to the next: always read the official term sheet on the Italian Treasury Department's website before subscribing. Our tables only show fixed-coupon securities that we can compare on a like-for-like basis.</p>
<h3 id="italy-tax">Italian taxation and other advantages</h3>
<p>Under Italian rules, interest and capital gains on Italian government bonds are taxed at <strong>12.5%</strong>, against 26% for corporate bonds. Government bonds are also exempt from Italian inheritance tax and, within the limits set by law, excluded from the calculation of the ISEE (the Italian means-test indicator). For the same gross yield, a BTP therefore yields more net of tax than a corporate bond for an Italian investor: take this into account when comparing.</p>
<h2 id="france-oat">France: how an OAT works</h2>
<p><strong>OATs</strong>, Obligations Assimilables du Trésor, are the medium and long-term debt securities of the French state. They are issued by the <strong>Agence France Trésor</strong> (AFT) and serve as the reference for interest rates in France: the 10-year OAT rate influences mortgages, the return of euro-denominated life insurance funds and the financing costs of companies.</p>
<p>A classic OAT pays a <strong>fixed coupon once a year</strong> and repays its face value at maturity, from 2 to 50 years. "Assimilable" means the AFT can reopen an existing line and issue new securities identical to the old ones, which makes OATs very liquid. Private investors buy them on the secondary market, through their bank or a broker, or indirectly through funds and life insurance.</p>
<h3 id="france-inflation">OATi and OAT€i: inflation-linked OATs</h3>
<p>The <strong>OATi</strong> is indexed to French inflation excluding tobacco, the <strong>OAT€i</strong> to euro-area inflation excluding tobacco. Capital and coupons are revalued with the price index: they protect against higher-than-expected inflation. Their "real" yield cannot be compared directly with the nominal yield of a classic OAT, which is why they do not appear in our tables.</p>
<h3 id="oat-bund-spread">The OAT-Bund spread</h3>
<p>The gap between the yield of the OAT and that of the German Bund with the same maturity measures the premium investors demand for lending to France rather than to Germany. It widens when the market worries about French public finances or the political situation, and narrows when confidence returns.</p>
<h2 id="germany-bund">Germany: Bunds, Bobls and Schätze</h2>
<p>German federal securities are issued by the <strong>German Finance Agency</strong> (Finanzagentur des Bundes) and are considered the safest bonds in the euro area.</p>
<ul>
<li><strong>Federal Treasury notes (Schätze)</strong>: 2-year maturity.</li>
<li><strong>Federal notes (Bobl)</strong>: 5-year maturity.</li>
<li><strong>Federal bonds (Bund)</strong>: maturities from 7 to 30 years, the best known being the 10-year.</li>
<li><strong>Green federal securities</strong>: the proceeds go to climate and environmental projects; otherwise they have the same terms as their conventional "twins".</li>
</ul>
<p>All pay a fixed coupon once a year and repay the face value at maturity. Private investors buy them on the exchange through a bank or broker, or indirectly through bond funds and ETFs. The 10-year Bund yield is also the starting point for spreads: the gap to Italian or French government bonds shows how the market assesses their credit risk.</p>
<h2 id="risks">The risks of government bonds</h2>
<p>The first is <strong>interest rate risk</strong>: if rates rise, the price of bonds already issued falls, and falls more for long maturities (see the guide on <a href="/knowledge/bond-duration">duration</a>). Anyone who sells before maturity may receive less than they paid. The yield can also be below the rate of inflation.</p>
<p>The second is <strong>credit risk</strong>, and here the three countries differ:</p>
<ul>
<li><strong>Germany</strong>: all the major rating agencies give the federal government the top AAA rating.</li>
<li><strong>France</strong>: the credit risk of the French state is judged low by the rating agencies, but France's rating has been lowered in recent years, so OATs are not risk-free in the strict sense.</li>
<li><strong>Italy</strong>: Italy has a rating in the BBB band, that is investment grade but not among the highest in the euro area. This is why BTPs yield more than German Bunds and French OATs.</li>
</ul>
<h2 id="taxation">Taxation in France and Germany</h2>
<p>For an individual resident in France, coupons and capital gains on an OAT held in a securities account are in principle subject to the single flat-rate levy (the "flat tax"), with an option for the progressive scale. Its rate has changed in recent years: check the rate in force with your bank or on impots.gouv.fr.</p>
<p>In Germany, interest and capital gains are subject to the <strong>flat-rate withholding tax</strong> (Abgeltungsteuer) of 25%, plus the solidarity surcharge and church tax where applicable. Investment income up to the saver's allowance (Sparer-Pauschbetrag) is tax-free if an exemption order has been filed. Have your own situation checked by your bank or a tax adviser. The yields on 10BONDS are always gross.</p>
<h2 id="how-to-compare">How to compare European government bonds</h2>
<p>First choose the horizon that suits you, then compare the yield curves by maturity: the difference between the BTP or OAT curve and the Bund curve, maturity by maturity, is the spread. If you want more yield, compare government bonds with corporate bonds of the same duration in the <a href="/">bond finder</a>. The guide <a href="/knowledge/government-vs-corporate-bonds">government or corporate bonds?</a> explains what changes.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: choose the duration you need and see where BTPs, OATs and Bunds rank among the 10 bonds.</p>
`,
  },
  {
    slug: "government-vs-corporate-bonds",
    group: "compare",
    section: "best",
    title: "BTPs or corporate bonds? How to compare yield and risk",
    seoTitle: "Government vs corporate bonds: how to compare",
    metaDescription: "Government bonds (BTPs) or corporate bonds: how to compare yield, credit risk, taxation and diversification with a simple method.",
    primaryKeyword: "government vs corporate bonds",
    bodyHtml: `
<p>A question many Italian savers ask: is it better to buy a <strong>BTP</strong>, an Italian government bond, or a <strong>corporate bond</strong>, issued by a company or a bank? There is no answer that works for everyone, but there is a method for comparing them correctly.</p>
<p>The method is the same whichever government bond you start from. The five steps below look at horizon, net yield, risk premium, rating and diversification, in that order.</p>
<p>The aim is not to declare a winner in general, but to make sure that when you put two bonds side by side, the difference in yield you see reflects a real difference in what you are being paid for, and not just a difference in maturity, tax treatment or name.</p>
<h2 id="same-horizon">1. Compare over the same horizon</h2>
<p>A 2-year BTP and a 10-year bond are not comparable: the second yields more simply because it is longer and more sensitive to interest rates. First choose the <a href="/knowledge/bond-duration">duration</a> that suits your horizon, then compare yields within that band.</p>
<p>Comparing across different durations mixes two different risks, interest rate risk and credit risk, and makes it impossible to tell which one the extra yield is paying for.</p>
<h2 id="net-yield">2. Compare net yields</h2>
<p>The yields shown are gross. Under Italian rules, the tax on BTPs is 12.5%, on corporate bonds 26%. Example: a BTP at 3.5% gross yields about 3.06% net; a corporate bond at 4% gross yields about 2.96% net. In this case the BTP, while yielding less gross, yields more net.</p>
<p>If you are taxed in another country the rates will be different, and the difference between government and corporate bonds may be smaller or absent. The principle still holds: compare what you keep, not the headline number.</p>
<h2 id="premium">3. Ask yourself how much premium you are receiving</h2>
<p>The difference in yield between a corporate bond and a BTP of the same duration is the company's <strong>risk premium</strong>. A premium of a few tenths of a point for an issuer rated lower than Italy is rarely a good deal; a wide premium for a solid issuer deserves attention, but always ask yourself why the market demands it. The guide on <a href="/knowledge/bond-credit-risk">credit risk</a> explains how to read it.</p>
<h2 id="rating">4. Look at the rating, not just the name</h2>
<p>Some large European companies have a higher rating than the Italian state: their bonds may yield less than BTPs. Others, even very well-known ones, are <a href="/knowledge/high-yield-bonds">high yield</a>. A familiar name is not a measure of risk.</p>
<p>The rating, read together with the spread, tells you far more than the brand. A company you know well as a customer may still carry a high level of debt.</p>
<p>Compare the rating of the company with that of the government bond you are considering: if the company is rated lower, its bond should pay a clear premium; if it is rated higher, a lower yield may be perfectly reasonable.</p>
<h2 id="diversification">5. Think about diversification</h2>
<p>A portfolio made only of BTPs depends entirely on Italy. Adding bonds from different issuers, by sector and country, reduces dependence on a single debtor. This is why 10BONDS lists show only one bond per issuer.</p>
<p>The same reasoning applies to any single government: a portfolio of only one country's bonds is concentrated on one debtor, however safe it is considered. The guide on <a href="/knowledge/european-government-bonds">European government bonds</a> compares BTPs, OATs and Bunds.</p>
<h2 id="todays-data">Today's data</h2>
<p>Compare BTPs with euro corporate bonds and with <a href="/knowledge/investment-grade-bonds">investment grade</a> bonds in the <a href="/">bond finder</a>, updated every day.</p>
<p>Start from the <a href="/knowledge/yield-to-maturity">yield to maturity</a>, keep the duration fixed and move the rating: the list shows how much extra yield each step of risk is paying.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: set your horizon and target yield and compare governments and companies in the same list.</p>
`,
  },
  {
    slug: "how-to-compare-bonds-2026",
    group: "compare-bonds-2026",
    section: "best",
    title: "Bonds in 2026: how to compare yields, ratings and maturities",
    seoTitle: "Best bonds 2026: yields, ratings and maturities",
    metaDescription: "How to compare bonds in 2026: yield to maturity, rating, maturity and duration, BTPs and corporate bonds, liquidity, costs and taxation.",
    primaryKeyword: "best bonds 2026",
    bodyHtml: `<p><strong>Updated: 19 October 2026</strong></p>
<p>Anyone looking for the best bonds in 2026 faces a complex market: Italian and European government bonds, corporate bonds, short-term issues and instruments with maturities of more than ten years.</p>
<p>But how do you compare different bonds objectively?</p>
<p>The starting point is to consider <strong>yield to maturity, credit risk, maturity and purchase price</strong> at the same time. A higher yield, on its own, does not necessarily indicate better terms.</p>
<h2 id="yield-to-maturity">1. Yield to maturity: the first indicator</h2>
<p>The yield to maturity (YTM) is the rate that makes the purchase price equal to the present value of the future cash flows provided for by the security.</p>
<p>Unlike the nominal coupon, the yield to maturity also takes into account the effect of the price paid and of the final repayment.</p>
<p>For example, a bond with a 3% annual coupon bought below par can offer a yield to maturity above 3%.</p>
<p>Conversely, if the same bond is bought above par, the yield to maturity can be lower than the coupon.</p>
<p>The calculated yield assumes that the contractual cash flows are paid and that the security is held until maturity. It is not a guaranteed return.</p>
<h2 id="rating">2. Bond ratings: how to interpret risk</h2>
<p>Rating agencies classify the credit quality of issuers.</p>
<p>In general, bonds are divided into two broad categories:</p>
<table><thead><tr><th scope="col">Category</th><th scope="col">Indicative S&amp;P rating</th><th scope="col">Characteristics</th></tr></thead><tbody>
<tr><td>Investment grade</td><td>From AAA to BBB−</td><td>Relatively higher credit quality</td></tr>
<tr><td>Speculative grade</td><td>From BB+ to D</td><td>Generally higher credit risk</td></tr>
</tbody></table>
<p>The rating provides an assessment of creditworthiness, but it does not eliminate the risk of default.</p>
<p>Even two bonds with an identical rating can show important differences in yield, liquidity, subordination and maturity.</p>
<h2 id="maturity">3. Which maturity to compare: 3, 5, 7 or 10 years?</h2>
<p>The remaining maturity is an essential parameter.</p>
<p>Bonds with a more distant maturity tend, all other conditions being equal, to be more sensitive to changes in interest rates.</p>
<p>This sensitivity is measured by duration.</p>
<p>It is important to distinguish:</p>
<ul><li><strong>Remaining maturity:</strong> the time left until contractual repayment.</li><li><strong>Duration:</strong> a measure of the sensitivity of the price to changes in market yields.</li></ul>
<p>A bond with a remaining maturity of ten years does not necessarily have a duration of ten years.</p>
<p>To compare different securities, it is therefore useful to examine both maturity and duration.</p>
<h2 id="btp-corporate">4. BTPs and corporate bonds: what are the differences?</h2>
<p>BTPs are debt securities issued by the Italian state.</p>
<p>Corporate bonds are issued by companies and can belong to different sectors, such as industry, telecommunications, energy or financial services.</p>
<table><thead><tr><th scope="col">Feature</th><th scope="col">BTP</th><th scope="col">Corporate bonds</th></tr></thead><tbody>
<tr><td>Issuer</td><td>Italian state</td><td>Company</td></tr>
<tr><td>Credit risk</td><td>Linked to the Italian state</td><td>Linked to the issuer and to the structure of the security</td></tr>
<tr><td>Coupons</td><td>Depend on the type of BTP</td><td>Depend on the terms of issue</td></tr>
<tr><td>Ordinary Italian taxation</td><td>Generally 12.5% on relevant income</td><td>Generally 26%, with exceptions</td></tr>
<tr><td>Liquidity</td><td>Varies by issue</td><td>Varies by issue</td></tr>
</tbody></table>
<p>The higher yield of a corporate bond can reflect higher credit risk, lower liquidity or other contractual features.</p>
<h2 id="five-elements">5. Five elements to check before comparing two bonds</h2>
<p>A comparison should include:</p>
<ol><li><strong>Yield to maturity:</strong> how much the market price pays, according to the assumptions of the calculation.</li><li><strong>Rating and credit risk:</strong> what the credit quality of the issuer is.</li><li><strong>Maturity and duration:</strong> how long the investment lasts and how the price may react to interest rates.</li><li><strong>Liquidity:</strong> how easy it may be to sell the security before maturity.</li><li><strong>Costs and taxation:</strong> what the impact on the return actually obtained may be.</li></ol>
<h2 id="simple-comparison">6. How to compare bonds more simply</h2>
<p>Rather than looking at dozens of instruments one by one, a comparison platform can organise the information using consistent criteria.</p>
<p>With our tool you can select two parameters:</p>
<ul><li>Risk level.</li><li>Desired maturity.</li></ul>
<p>The system returns a comparative selection of ten bonds, with information on yields, ratings and maturities according to a documented methodology.</p>
<p><a class="cta" href="/">Compare bonds</a></p>
<h2 id="faq">Frequently asked questions</h2>
<h3>Are the bonds with the highest yield also the best value?</h3>
<p>Not necessarily. High yields can reflect higher credit, liquidity or structural risks.</p>
<h3>Can you lose money with an investment grade bond?</h3>
<p>Yes. The rating does not guarantee repayment and the market price can fall.</p>
<h3>What happens if I sell before maturity?</h3>
<p>The selling price depends on market conditions at that moment. The investor may realise a capital gain or a capital loss.</p>
<h3>Are yield to maturity and coupon the same thing?</h3>
<p>No. The coupon is the contractual periodic payment; the yield to maturity also takes into account the purchase price and the expected cash flows up to repayment.</p>
<hr>
<p><strong>Sources:</strong> <a href="https://www.borsaitaliana.it/notizie/sotto-la-lente/btp.htm">Borsa Italiana — Guide to BTPs</a>; <a href="https://www.consob.it/ProspettiPortlet/DownloadProspetto?EmitID=217319">CONSOB — Documentation on bond yields</a>.</p>
<p><em>This information is for informational and educational purposes only. It does not constitute a personalised investment recommendation. Yields and ratings may change over time.</em></p>`,
  },
  {
    slug: "government-bonds-or-bond-etfs",
    group: "bonds-vs-etf",
    section: "academy",
    title: "BTPs or bond ETFs: what are the differences?",
    seoTitle: "BTPs or Bond ETFs? Differences, Costs and Risks",
    metaDescription: "BTPs and bond ETFs compared: coupons, maturities, diversification, costs and risks. How the two instruments work.",
    primaryKeyword: "btp or bond etf",
    bodyHtml: `
<p>BTPs and bond ETFs both give you exposure to the bond market, but they work differently. A BTP is a single bond issued by the Italian state. A bond ETF is an exchange-traded fund that holds a basket of bonds.</p>
<h2 id="maturity">Maturity and repayment</h2>
<p>A traditional BTP has a fixed maturity date and defined repayment terms. A traditional bond ETF, by contrast, generally keeps a rolling portfolio and does not repay your investment on a single date.</p>
<p>There are also fixed-maturity bond ETFs, which behave differently from traditional funds.</p>
<h2 id="diversification">Diversification</h2>
<p>Buying a single BTP means a specific exposure to Italian government debt. An ETF can spread your money across several issuers and maturities, depending on what it holds.</p>
<h2 id="costs-and-risks">Costs and risks</h2>
<p>When comparing the two, check:</p>
<ul><li>Trading commissions.</li><li>The fund's ongoing charges, where applicable.</li><li>The bid-ask spread.</li><li>Sensitivity to interest rates.</li><li>Credit risk.</li><li>Tax treatment.</li></ul>
<p>There is no answer that fits every investor: the two instruments are built differently.</p>
<p><a class="cta" href="/">Explore the yield and risk of individual bonds</a></p>`,
  },
  {
    slug: "bond-default-rates-by-rating",
    group: "default-rates",
    section: "risk",
    title: "What is the historical default probability of a BBB rating?",
    seoTitle: "Default probability by rating: BBB, A, BB and more",
    metaDescription: "Historical default probability by rating, from AAA to CCC: BBB issuers defaulted in 1.44% of cases over 5 years and 3.52% over 10 years (S&P averages).",
    primaryKeyword: "default probability bbb rating",
    bodyHtml: `
<p><strong>Short answer:</strong> according to S&amp;P's long-run averages, a BBB-rated issuer defaulted in 0.16% of cases within 1 year, 1.44% within 5 years and 3.52% within 10 years. Out of 100 BBB issuers, on average fewer than 4 defaulted over ten years.</p>
<p>The table shows average cumulative default rates for each rating notch, from 1 to 15 years. A cumulative rate is the share of issuers with that rating at the start of the period that defaulted by the end of it.</p>
<h2 id="table">Cumulative default rates by rating (%)</h2>
<table><thead><tr><th scope="col">Rating</th><th scope="col">10BONDS risk</th><th scope="col">1 year</th><th scope="col">3 years</th><th scope="col">5 years</th><th scope="col">7 years</th><th scope="col">10 years</th><th scope="col">15 years</th></tr></thead><tbody>
<tr><td>AAA</td><td>1</td><td>0.00%</td><td>0.03%</td><td>0.13%</td><td>0.25%</td><td>0.44%</td><td>0.58%</td></tr>
<tr><td>AA+</td><td>2</td><td>0.00%</td><td>0.05%</td><td>0.15%</td><td>0.29%</td><td>0.52%</td><td>0.77%</td></tr>
<tr><td>AA</td><td>2</td><td>0.02%</td><td>0.10%</td><td>0.25%</td><td>0.43%</td><td>0.70%</td><td>1.05%</td></tr>
<tr><td>AA−</td><td>2</td><td>0.03%</td><td>0.15%</td><td>0.36%</td><td>0.57%</td><td>0.88%</td><td>1.34%</td></tr>
<tr><td>A+</td><td>3</td><td>0.04%</td><td>0.18%</td><td>0.39%</td><td>0.65%</td><td>1.10%</td><td>1.82%</td></tr>
<tr><td>A</td><td>3</td><td>0.05%</td><td>0.22%</td><td>0.48%</td><td>0.81%</td><td>1.38%</td><td>2.19%</td></tr>
<tr><td>A−</td><td>3</td><td>0.07%</td><td>0.28%</td><td>0.57%</td><td>0.98%</td><td>1.65%</td><td>2.52%</td></tr>
<tr><td>BBB+</td><td>4</td><td>0.11%</td><td>0.46%</td><td>0.98%</td><td>1.58%</td><td>2.54%</td><td>4.02%</td></tr>
<tr><td>BBB</td><td>5</td><td>0.16%</td><td>0.71%</td><td>1.44%</td><td>2.27%</td><td>3.52%</td><td>5.38%</td></tr>
<tr><td>BBB−</td><td>6</td><td>0.27%</td><td>1.22%</td><td>2.84%</td><td>4.08%</td><td>5.92%</td><td>8.44%</td></tr>
<tr><td>BB+</td><td>7</td><td>0.39%</td><td>1.85%</td><td>3.65%</td><td>5.52%</td><td>8.05%</td><td>11.22%</td></tr>
<tr><td>BB</td><td>7</td><td>0.63%</td><td>2.87%</td><td>5.48%</td><td>7.92%</td><td>11.08%</td><td>14.88%</td></tr>
<tr><td>BB−</td><td>7</td><td>0.95%</td><td>4.22%</td><td>7.98%</td><td>11.25%</td><td>15.18%</td><td>19.65%</td></tr>
<tr><td>B+</td><td>8</td><td>1.75%</td><td>6.20%</td><td>10.42%</td><td>13.95%</td><td>18.22%</td><td>23.40%</td></tr>
<tr><td>B</td><td>8</td><td>3.32%</td><td>10.32%</td><td>15.65%</td><td>19.68%</td><td>24.33%</td><td>29.50%</td></tr>
<tr><td>B−</td><td>8</td><td>6.25%</td><td>16.48%</td><td>23.10%</td><td>27.95%</td><td>33.15%</td><td>38.80%</td></tr>
<tr><td>CCC+</td><td>9</td><td>15.40%</td><td>28.50%</td><td>35.80%</td><td>40.10%</td><td>44.90%</td><td>49.50%</td></tr>
<tr><td>CCC / C</td><td>9–10</td><td>26.63%</td><td>40.85%</td><td>46.90%</td><td>50.41%</td><td>54.21%</td><td>57.86%</td></tr>
</tbody></table>
<p><em>Source: S&amp;P, average cumulative corporate default rates by rating notch (long-run historical average). The "10BONDS risk" column shows which 1-10 risk score each rating corresponds to in our bond finder.</em></p>
<h2 id="how-to-read">How to read the table</h2>
<p>As the rating falls, the default probability rises, and not in a straight line: at 5 years it goes from 1.44% for BBB to 2.84% for BBB−, then jumps to 5.48% for BB, the first fully speculative-grade notch. The line between investment grade (down to BBB−) and speculative grade (BB+ and below) is where risk changes pace.</p>
<p>Time matters as much as the rating. A 1-year probability cannot be compared with a 10-year one: for a BBB bond maturing in 5 years, the column to look at is the 5-year one.</p>
<h2 id="limits">What the table does not tell you</h2>
<ul><li>These are past averages across many issuers and economic cycles, not a forecast for any single issuer.</li><li>Default does not mean losing everything: how much is recovered depends on the bond's seniority and collateral.</li><li>The data covers companies; government bonds have a different default history.</li></ul>
<p>For how ratings, default probability and expected loss fit together, read the guides on <a href="/knowledge/bond-credit-risk">bond credit risk</a> and <a href="/knowledge/investment-grade-bonds">investment-grade bonds</a>.</p>
<p><a class="cta" href="/">Compare bonds by risk, yield and duration</a></p>`,
  },
  {
    // Livio's own article for the US market (19 Oct 2026), published word for word.
    slug: "treasury-bills-notes-bonds",
    group: "us-treasuries",
    section: "government",
    title: "Treasury Bills vs. Notes vs. Bonds: Understanding What You're Actually Buying",
    seoTitle: "Treasury Bills vs. Notes vs. Bonds: Maturities, Yields, Taxes",
    metaDescription: "T-bills, Treasury notes and Treasury bonds compared: maturities, coupons, yield to maturity, duration risk and how Treasury interest is taxed.",
    primaryKeyword: "treasury bills vs notes vs bonds",
    published: "2026-10-19",
    bodyHtml: `
<p><strong>An investor's guide to Treasury maturities, yields, taxes and the risks that matter.</strong></p>
<p>U.S. Treasury securities have a reputation for being among the safest investments available. Backed by the full faith and credit of the federal government, they are used by everyone from individual savers to central banks. Yet the label “Treasury” covers several instruments that behave quite differently.</p>
<p>A three-month Treasury bill and a 30-year Treasury bond may have the same issuer, but they serve very different purposes. One turns back into cash within weeks. The other can fluctuate substantially in price as interest rates change. And while both carry the credit of the U.S. government, that does not mean their investment outcomes are interchangeable.</p>
<p>The most useful place to begin is with their maturity.</p>
<h2 id="essential-differences">Treasury bills, notes and bonds: the essential differences</h2>
<p>The Treasury divides its marketable fixed-rate securities into three principal categories.</p>
<p><strong>Treasury bills</strong>, commonly called T-bills, mature in one year or less. They do not make regular coupon payments. Instead, investors generally purchase them at a discount to face value and receive the full face value at maturity. The difference represents their interest income.</p>
<p><strong>Treasury notes</strong> have original maturities of two, three, five, seven or ten years. They pay a fixed coupon every six months and return the principal at maturity.</p>
<p><strong>Treasury bonds</strong> are issued with original maturities of 20 or 30 years. Like notes, they generally pay interest semiannually.</p>
<table>
<thead><tr><th>Security</th><th>Original maturity</th><th>Interest structure</th></tr></thead>
<tbody>
<tr><td>Treasury bill</td><td>4–52 weeks</td><td>Generally issued at a discount</td></tr>
<tr><td>Treasury note</td><td>2–10 years</td><td>Fixed semiannual coupons</td></tr>
<tr><td>Treasury bond</td><td>20 or 30 years</td><td>Fixed semiannual coupons</td></tr>
</tbody>
</table>
<p>All three can be sold before maturity. Their resale prices, however, depend on prevailing market conditions.</p>
<p>An important distinction is that the Treasury's labels describe maturity when the security was originally issued. A Treasury bond issued 25 years ago may have only five years remaining until repayment. For someone buying it today, that remaining maturity is often more relevant than its original classification.</p>
<h2 id="coupon-vs-return">Why a higher coupon doesn't necessarily mean a higher return</h2>
<p>Suppose you compare two Treasury notes. The first has a coupon of 4%, while the second pays 2%.</p>
<p>It is tempting to conclude that the first must be the more rewarding investment. But the conclusion depends on the price.</p>
<p>Treasury securities trade in the secondary market, where prices adjust as interest rates change. An older note with a 2% coupon may trade below its face value if newly issued securities offer higher yields. The discount can compensate a buyer for receiving smaller coupon payments.</p>
<p>Conversely, a note paying a 4% coupon may trade above face value when market yields are lower.</p>
<p>This is why professional bond comparisons focus on <strong>yield to maturity</strong>, rather than the coupon alone.</p>
<p>Yield to maturity incorporates the price paid, remaining coupons, the repayment amount and the time until maturity. It provides a common basis for comparing fixed-rate obligations, assuming promised payments are made.</p>
<p>For Treasuries purchased between coupon dates, the accrued interest and settlement conventions also matter. A quotation on a brokerage screen is only the starting point for understanding the actual amount paid.</p>
<h2 id="long-term-risk">The overlooked risk of long-term Treasuries</h2>
<p>The credit risk of a Treasury bill and a Treasury bond is associated with the same federal government. Their exposure to interest-rate movements, however, can be dramatically different.</p>
<p>Imagine purchasing a 30-year Treasury bond and then seeing market yields rise by one percentage point.</p>
<p>Because the bond's coupon is fixed, its price must fall to provide a competitive yield to new buyers. The decline can be substantial, particularly for a long-duration security.</p>
<p>Now imagine holding a Treasury bill that matures in three months. Its market value may also move, but its remaining life is short, so its sensitivity to the same interest-rate change is generally much smaller.</p>
<p>This difference is measured using <strong>duration</strong>.</p>
<p>Duration is not simply the number of years remaining before repayment. It is a measure of how sensitive a bond's price is to changes in yield.</p>
<p>For example, a security with a modified duration of eight years could experience an approximate 8% price decline following a one-percentage-point increase in yield, before accounting for convexity and other market effects.</p>
<p>That doesn't mean a long-term Treasury necessarily loses money if held to maturity. Provided the Treasury meets its payment obligations, the contractual coupons and redemption amount remain defined. But an investor who needs to sell early may realize a gain or loss that differs significantly from the original yield-to-maturity calculation.</p>
<p>The distinction between predictable contractual cash flows and unpredictable interim market prices is fundamental to bond investing.</p>
<h2 id="taxes">Are Treasury securities tax-free?</h2>
<p>Not entirely.</p>
<p>Interest earned on Treasury bills, notes and bonds is generally subject to <strong>federal income tax</strong>, but it is exempt from state and local income taxes.</p>
<p>That distinction can matter considerably for investors living in states with relatively high income-tax rates.</p>
<p>A Treasury security and a corporate bond with identical headline yields may produce different after-tax outcomes because their interest income may be treated differently.</p>
<p>U.S. investors should also distinguish Treasury securities from <a href="/knowledge/municipal-bonds-vs-treasuries">municipal bonds</a>, whose interest may qualify for federal and sometimes state tax exemptions, depending on the security and the investor's circumstances.</p>
<p>The tax consequences of buying a Treasury above or below par can involve additional rules, so a simple comparison of coupon rates after tax is not always sufficient.</p>
<h2 id="what-to-compare">What should investors compare?</h2>
<p>Consider two securities with approximately five years remaining until maturity: a Treasury note and an <a href="/knowledge/corporate-bonds-vs-treasuries">investment-grade corporate bond</a>.</p>
<p>If the corporate bond offers a higher yield, that additional return is not free. It may compensate the investor for corporate credit risk, reduced liquidity or particular contractual features.</p>
<p>The Treasury's yield provides a useful reference point. The difference between the yields is one way of examining the additional compensation demanded by the market.</p>
<p>A meaningful comparison therefore starts with the remaining maturity and duration, then considers yield, credit quality and trading costs.</p>
<p>This approach is more informative than simply searching for the highest coupon.</p>
<h2 id="explore">A better way to explore fixed-income securities</h2>
<p>There are thousands of bonds available in the market, including government and corporate issues with different maturities and risk characteristics.</p>
<p>10BONDS is designed to simplify that complexity. By choosing a desired duration and yield, users can explore a shortlist of bonds with comparable characteristics and review their yield, duration and credit-risk information.</p>
<p>The objective is to make differences between securities easier to understand—not to replace the judgment required in making an investment decision.</p>
<p><a class="cta" href="/">Explore bonds by duration and yield on 10BONDS.</a></p>
<h3 id="sources">Sources and further reading</h3>
<ul>
<li>U.S. Treasury — Treasury Notes: <a href="https://treasurydirect.gov/marketable-securities/treasury-notes/">https://treasurydirect.gov/marketable-securities/treasury-notes/</a></li>
<li>U.S. Treasury — Treasury Bills: <a href="https://treasurydirect.gov/marketable-securities/treasury-bills/">https://treasurydirect.gov/marketable-securities/treasury-bills/</a></li>
<li>U.S. Treasury — Understanding Pricing and Interest Rates: <a href="https://www.treasurydirect.gov/marketable-securities/understanding-pricing/">https://www.treasurydirect.gov/marketable-securities/understanding-pricing/</a></li>
<li>Internal Revenue Service — Topic 403, Interest Received: <a href="https://www.irs.gov/taxtopics/tc403">https://www.irs.gov/taxtopics/tc403</a></li>
</ul>
<p><em>This article is intended for general financial education. It does not constitute personalized investment advice or a recommendation to purchase a particular security.</em></p>
`,
  },
  {
    // Livio's own article for the US market (19 Oct 2026), published word for word.
    slug: "corporate-bonds-vs-treasuries",
    group: "us-corporate-vs-treasuries",
    section: "government",
    title: "Corporate Bonds vs. Treasury Bonds: What Are You Really Being Paid For?",
    seoTitle: "Corporate Bonds vs. Treasury Bonds: Yield and Risk",
    metaDescription: "Why do corporate bonds pay more than Treasuries? Compare credit spreads, duration, liquidity, taxes and the risks behind higher yields.",
    primaryKeyword: "corporate bonds vs treasury bonds",
    published: "2026-10-19",
    bodyHtml: `
<p><em>Two bonds can mature on the same date and offer very different yields. The gap between them tells a story about risk, liquidity and what investors are willing to pay for certainty.</em></p>
<p>Imagine opening your brokerage account and finding two bonds with approximately five years remaining until maturity. One is issued by the U.S. Treasury and yields 4%. The other is issued by a large American corporation and yields 5.2%.</p>
<p>Both securities promise periodic interest payments and the return of principal at maturity. Both are denominated in dollars. Both have similar durations.</p>
<p>The corporate bond offers an additional 1.2 percentage points of annualized yield. On a $100,000 position, that difference might appear to represent $1,200 a year.</p>
<p>The arithmetic is straightforward. Understanding what the additional yield compensates you for is considerably more interesting.</p>
<p>The corporate bond's yield is higher because investors are not buying the same financial promise.</p>
<h2 id="the-treasury-yield-as-a-starting-point">The Treasury yield as a starting point</h2>
<p><a href="/knowledge/treasury-bills-notes-bonds">U.S. Treasury securities</a> are backed by the full faith and credit of the federal government. They play a central role in global financial markets, and their yields are widely used as reference rates for valuing other debt securities.</p>
<p>A Treasury yield reflects several forces, including expected interest rates, inflation, the maturity of the obligation and the balance between supply and demand.</p>
<p>Corporate bond investors face those same broad market forces, but they also need to assess whether an individual business will continue to generate sufficient cash to repay its debt.</p>
<p>This difference produces what financial markets call a <em>credit spread</em>.</p>
<p>In its simplest form, the spread is the difference between the yield on a corporate bond and the yield on a comparable Treasury security.</p>
<p>If a corporate bond yields 5.2% while a comparable Treasury yields 4%, the quoted difference is 120 basis points, since one basis point represents 0.01 percentage points.</p>
<p>That spread is a starting point for understanding the market's compensation for taking risks beyond those of a Treasury. It is not, however, a direct measure of the probability that the corporate issuer will default.</p>
<h2 id="what-the-credit-spread-really-contains">What the credit spread really contains</h2>
<p>The most obvious component is credit risk.</p>
<p>A corporation may encounter falling revenues, rising borrowing costs, competitive pressure or financial difficulties that impair its ability to meet debt obligations. Investors generally demand additional yield to assume that uncertainty.</p>
<p>But credit risk does not explain the entire spread.</p>
<p>Corporate bonds may trade less frequently than Treasury securities. If an investor needs to sell quickly, finding a buyer at a satisfactory price can be difficult. Part of the higher yield may therefore compensate for reduced liquidity.</p>
<p>The structure of the security also matters. A senior unsecured bond, a subordinated bond and a callable bond issued by the same company can have materially different risk characteristics.</p>
<p>Finally, spreads reflect market sentiment. During periods of financial stress, investors often demand higher compensation for corporate credit exposure, even when individual companies have not materially changed.</p>
<p>This is why a credit spread should be interpreted as a market price for several forms of risk, not simply as an expected default-loss calculation.</p>
<h2 id="why-a-credit-rating-doesn-t-tell-the-whole-story">Why a credit rating doesn't tell the whole story</h2>
<p>Credit rating agencies attempt to evaluate the relative creditworthiness of issuers and financial instruments.</p>
<p>Investment-grade ratings generally range from AAA to BBB− on the S&amp;P scale. Ratings below BBB− fall into the speculative-grade category.</p>
<p>These distinctions are useful, but they should not be confused with a precise forecast of returns.</p>
<p>Consider two hypothetical BBB-rated companies. One operates a stable business with recurring revenues and relatively modest financial leverage. The other operates in a cyclical industry, where earnings fluctuate considerably.</p>
<p>Their ratings may fall within the same category while their bonds trade at different spreads.</p>
<p>Bond-specific features create further differences. Debt seniority, guarantees, covenants and recovery prospects all influence the consequences of financial distress.</p>
<p>For investors comparing corporate bonds, the relevant question is not merely whether a security carries an investment-grade rating. It is whether its yield adequately reflects the particular combination of risks present in that issue.</p>
<h2 id="a-worked-example-how-much-additional-yield-is-enough">A worked example: how much additional yield is enough?</h2>
<p>Let's return to the hypothetical five-year bonds.</p>
<table>
<thead><tr><th>Characteristic</th><th>Treasury</th><th>Corporate bond</th></tr></thead>
<tbody>
<tr><td>Yield to maturity</td><td>4.00%</td><td>5.20%</td></tr>
<tr><td>Remaining maturity</td><td>5 years</td><td>5 years</td></tr>
<tr><td>Credit issuer</td><td>U.S. government</td><td>Corporation</td></tr>
<tr><td>Additional yield</td><td>—</td><td>1.20 percentage points</td></tr>
</tbody>
</table>
<p>Suppose, solely for illustration, that the corporate issuer has a cumulative five-year default probability of 3% and that a default would cause a loss of 60% of the investment's exposure.</p>
<p>The simplified expected credit loss over the five-year horizon would be 1.8% of exposure.</p>
<p>That calculation is not an accurate forecast of the bond's annual return. It ignores when a possible default occurs, how much the investor has already received in coupons, changes in recovery assumptions and the time value of money.</p>
<p>It does, however, illustrate why gross yield cannot be viewed independently of potential credit losses.</p>
<p>The additional 1.2 percentage points of quoted annual yield is not a guaranteed excess return. Some of the spread compensates investors for bearing uncertainty, including losses that may be rare but substantial.</p>
<p>A more rigorous comparison would examine annualized default assumptions, recovery estimates, the bond's cash-flow schedule and the market value of both securities.</p>
<h2 id="interest-rate-risk-still-matters">Interest-rate risk still matters</h2>
<p>It is tempting to describe Treasuries as safe and corporate bonds as risky. That distinction is too simplistic.</p>
<p>A long-duration Treasury bond can experience substantial price fluctuations when market interest rates change. A short-duration investment-grade corporate bond may be less sensitive to general interest-rate movements, even though it introduces additional credit risk.</p>
<p>When comparing securities, maturity alone is not always sufficient. Duration provides a more useful measure of price sensitivity.</p>
<p>For example, a bond with modified duration of six years might decline approximately 6% in price if its required yield rises by one percentage point, before accounting for convexity and other effects.</p>
<p>For a corporate bond, that required yield can rise because Treasury yields increase, because its credit spread widens, or because both occur simultaneously.</p>
<p>The separation between interest-rate exposure and credit-spread exposure is therefore essential.</p>
<h2 id="liquidity-and-transaction-costs">Liquidity and transaction costs</h2>
<p>The U.S. Treasury market is exceptionally large and generally liquid, particularly for recently issued benchmark securities.</p>
<p>Corporate bond liquidity is much more fragmented.</p>
<p>Two corporate issues from the same company can trade with very different frequency and bid-ask spreads. Smaller positions may also face less favorable execution terms than institutional trades.</p>
<p>The yield visible on a financial website is not necessarily the yield an individual investor can obtain.</p>
<p>The actual execution price, dealer markup or markdown, and transaction charges may change the effective return.</p>
<p>This is especially important when comparing securities whose quoted yields differ by only a few basis points.</p>
<h2 id="taxes-can-change-the-comparison">Taxes can change the comparison</h2>
<p>Interest on Treasury securities is generally subject to federal income tax but exempt from state and local income taxes.</p>
<p>Corporate bond interest is generally subject to federal income tax and may also be subject to state and local income taxes.</p>
<p>For an investor subject to significant state income taxes, this difference can narrow the corporate bond's apparent advantage.</p>
<p>The correct calculation depends on the investor's tax circumstances and the characteristics of the securities. Quoted pre-tax yields alone cannot establish which provides the greater after-tax return.</p>
<h2 id="comparing-bonds-rather-than-headlines">Comparing bonds rather than headlines</h2>
<p>The central lesson is that the highest quoted yield does not necessarily represent the most attractive risk-adjusted outcome.</p>
<p>An informative comparison considers yield, duration, credit quality, seniority, liquidity and costs together.</p>
<p>That is the principle behind 10BONDS. Rather than treating bonds as interchangeable products, the platform organizes available euro-denominated government and corporate securities by their financial characteristics.</p>
<p>Users can explore how bonds with similar durations differ in yield and credit risk, without treating the resulting shortlist as a personalized investment recommendation.</p>
<p><a class="cta" href="/">Explore bond yields, duration and risk on 10BONDS.</a></p>
<h3 id="sources-and-further-reading">Sources and further reading</h3>
<ul>
<li>SEC Investor.gov — Corporate Bonds: <a href="https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds-or-fixed-income-products">https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds-or-fixed-income-products</a></li>
<li>SEC Investor.gov — What Are Corporate Bonds?: <a href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/what-are">https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/what-are</a></li>
<li>U.S. Treasury — Understanding Pricing and Interest Rates: <a href="https://www.treasurydirect.gov/marketable-securities/understanding-pricing/">https://www.treasurydirect.gov/marketable-securities/understanding-pricing/</a></li>
<li>IRS — Publication 550, Investment Income and Expenses: <a href="https://www.irs.gov/publications/p550">https://www.irs.gov/publications/p550</a></li>
</ul>
<p><em>This article is provided for general financial education. Numerical examples are hypothetical and do not represent available investment opportunities or recommendations.</em></p>
`,
  },
  {
    // Livio's own article for the US market (19 Oct 2026), published word for word.
    slug: "tips-vs-treasury-bonds",
    group: "us-tips-vs-treasuries",
    section: "government",
    title: "TIPS vs. Treasury Bonds: What Inflation Protection Really Means",
    seoTitle: "TIPS vs. Treasury Bonds: Inflation and Real Returns",
    metaDescription: "How do TIPS protect against inflation? Compare inflation-protected Treasuries with conventional Treasury bonds using worked examples and real yields.",
    primaryKeyword: "TIPS vs treasury bonds",
    published: "2026-10-19",
    bodyHtml: `
<p><em>An ordinary Treasury pays fixed nominal amounts. An inflation-protected Treasury adjusts its principal. That difference can have a substantial effect on purchasing power.</em></p>
<p>The most important number on a bond statement is not always the yield. Sometimes it is what that yield will be worth when the money is eventually spent.</p>
<p>Consider an investor who purchases a conventional Treasury security yielding 4%. Over the following five years, inflation averages 2%. The nominal interest payments may look satisfactory, and the investor receives the amounts specified by the security. But the purchasing power of those dollars has declined as prices have risen.</p>
<p>Now imagine that inflation averages 6% instead.</p>
<p>The same Treasury still pays its contractual nominal coupons and principal. The investment has not necessarily suffered a default or a nominal loss. Yet its purchasing power has been eroded much more severely.</p>
<p>Treasury Inflation-Protected Securities, commonly called TIPS, were designed to address precisely this distinction between nominal money and real purchasing power.</p>
<p>Understanding them requires looking beyond their coupon rates.</p>
<h2 id="how-tips-work">How TIPS work</h2>
<p>TIPS are securities issued by the U.S. Treasury whose principal is adjusted in accordance with changes in the Consumer Price Index for All Urban Consumers, or CPI-U, using the Treasury's applicable indexation methodology.</p>
<p>Unlike a conventional <a href="/knowledge/treasury-bills-notes-bonds">Treasury note or bond</a>, which has a fixed face value payable at maturity, a TIPS security has an inflation-adjusted principal amount.</p>
<p>As the relevant inflation index rises, the adjusted principal generally increases. During deflationary periods, it may decrease.</p>
<p>TIPS pay interest twice a year. Their stated coupon rate is fixed when issued, but the dollar amount of each payment changes because the rate is applied to the adjusted principal.</p>
<p>At maturity, the Treasury pays the greater of the inflation-adjusted principal or the security's original principal amount, under the applicable terms. An investor who purchases a TIPS in the secondary market at a premium should not assume this floor guarantees recovery of the price they personally paid.</p>
<p>The structure is different from a savings bond. TIPS are marketable securities, which means investors can buy and sell them before maturity at prices determined by the market.</p>
<h2 id="a-simple-illustration">A simple illustration</h2>
<p>Suppose an investor purchases $10,000 of original principal in a hypothetical TIPS issue with a fixed coupon rate of 1.5%.</p>
<p>For clarity, assume that the inflation adjustment over the first year is exactly 3%.</p>
<p>The adjusted principal would rise from $10,000 to approximately $10,300. The annualized coupon rate remains 1.5%, but it is now applied to the higher adjusted principal.</p>
<p>If the adjusted principal subsequently rises again, the dollar amount of the interest payments rises with it.</p>
<p>Now suppose a period of deflation follows. The adjusted principal could decline, reducing the coupon payments calculated from it.</p>
<p>The principal adjustment is therefore not a one-way increase. The protection is linked to inflation over the life of the security and to the contractual principal floor at maturity.</p>
<p>The important distinction is that the TIPS mechanism adjusts nominal cash flows to reflect changes in the inflation index. It does not guarantee that the investor will earn a positive real return after taxes, trading costs or changes in market value.</p>
<h2 id="nominal-yields-versus-real-yields">Nominal yields versus real yields</h2>
<p>Conventional Treasury yields are generally described as nominal yields. They reflect returns in dollars that are not automatically adjusted for future inflation.</p>
<p>TIPS yields are quoted as real yields, because their principal is linked to inflation.</p>
<p>This difference creates a useful comparison.</p>
<p>Suppose a conventional five-year Treasury yields 4%, while a comparable five-year TIPS yields 1.6% on a real basis.</p>
<p>The difference of 2.4 percentage points is a commonly used approximation of the market's five-year breakeven inflation rate.</p>
<p>If realized inflation turns out higher than the market's breakeven level, TIPS may outperform comparable nominal Treasuries on an appropriately measured basis. If realized inflation is lower, conventional Treasuries may perform better.</p>
<p>The relationship is not exact. Inflation risk premiums, liquidity differences, indexation lags and other market factors can affect the observed spread between nominal and real yields.</p>
<p>Nevertheless, comparing the two yields is a valuable way to understand the price investors are paying for inflation protection.</p>
<h2 id="inflation-protection-does-not-eliminate-interest-rate-risk">Inflation protection does not eliminate interest-rate risk</h2>
<p>One of the most common misconceptions about TIPS is that their prices cannot decline when inflation increases.</p>
<p>In reality, TIPS are sensitive to changes in real interest rates.</p>
<p>Consider a long-maturity TIPS issue purchased when real yields are relatively low. If real market yields increase substantially, the security's price can decline—even during a period of elevated inflation.</p>
<p>The inflation adjustment protects the contractual principal mechanism, but it does not insulate the market price from changes in discount rates.</p>
<p>Duration matters here just as it does for conventional bonds.</p>
<p>A long-duration TIPS security can experience significant price volatility. An investor who needs to sell before maturity may realize a loss, notwithstanding the inflation adjustments accumulated over the holding period.</p>
<p>This is why two questions should be considered separately: How does the bond protect purchasing power over time, and how might its price behave if the investor sells before maturity?</p>
<h2 id="the-tax-complication-for-u-s-investors">The tax complication for U.S. investors</h2>
<p>TIPS introduce a tax issue that is particularly important in taxable brokerage accounts.</p>
<p>Under U.S. federal tax rules, an increase in a TIPS security's inflation-adjusted principal can generally create taxable income for a holder before that principal increase is actually received in cash.</p>
<p>In other words, an investor may owe federal income tax on an inflation adjustment even though the corresponding increase in principal remains invested in the security.</p>
<p>This effect is sometimes described informally as phantom income.</p>
<p>Interest and inflation adjustments on TIPS are generally subject to federal income tax, while Treasury interest receives favorable treatment under state and local income-tax rules.</p>
<p>The precise tax consequences depend on the holder's circumstances and the security's acquisition details.</p>
<p>For investors evaluating TIPS in taxable accounts, the timing of tax liabilities deserves as much attention as the advertised real yield.</p>
<h2 id="when-conventional-treasuries-and-tips-behave-differently">When conventional Treasuries and TIPS behave differently</h2>
<p>A conventional Treasury offers predictable nominal contractual payments. For someone comparing future cash flows in dollars, that structure is relatively straightforward.</p>
<p>A TIPS security offers cash flows that change according to the inflation adjustment. Its nominal payments are less predictable, but the structure is designed to provide protection against changes in the general price level.</p>
<p>Neither structure is universally superior.</p>
<p>If inflation turns out unexpectedly low, the premium associated with inflation protection may make conventional Treasuries more rewarding.</p>
<p>If inflation rises substantially beyond market expectations, TIPS may offer a relative advantage.</p>
<p>The outcome also depends on purchase price, duration, the realized path of inflation and whether the security is held to maturity.</p>
<h2 id="a-meaningful-comparison-begins-with-matching-maturities">A meaningful comparison begins with matching maturities</h2>
<p>It makes little sense to compare the nominal yield of a short Treasury bill with the real yield of a 30-year TIPS without accounting for duration.</p>
<p>A more informative approach is to compare securities with similar remaining maturities and understand how their sensitivity to interest rates differs.</p>
<p>A five-year conventional Treasury and a five-year TIPS provide a useful conceptual pairing, although their precise durations and cash-flow structures may still differ.</p>
<p>The analysis becomes especially useful when inflation expectations change, because prices reflect not only the level of inflation but also how future inflation compares with what markets previously anticipated.</p>
<h2 id="understanding-the-broader-bond-market">Understanding the broader bond market</h2>
<p>TIPS illustrate a wider lesson about fixed-income investing: a single yield figure never tells the complete story.</p>
<p>Nominal yield, real yield, duration and inflation exposure measure different aspects of a financial instrument.</p>
<p>10BONDS applies a comparable analytical approach to euro-denominated government and corporate bonds, helping users explore securities by duration and yield while examining their credit-risk characteristics.</p>
<p>The current bond finder does not claim to offer a dedicated TIPS comparison service. Its value lies in making fixed-income comparisons more transparent.</p>
<p><a class="cta" href="/">Explore government and corporate bond comparisons on 10BONDS.</a></p>
<h3 id="sources-and-further-reading">Sources and further reading</h3>
<ul>
<li>U.S. Treasury — Treasury Inflation-Protected Securities: <a href="https://www.treasurydirect.gov/marketable-securities/tips/">https://www.treasurydirect.gov/marketable-securities/tips/</a></li>
<li>U.S. Treasury — Inflation-Protected Securities Regulations: <a href="https://www.treasurydirect.gov/laws-and-regulations/auction-regulations-uoc/inflation-protected-securities/">https://www.treasurydirect.gov/laws-and-regulations/auction-regulations-uoc/inflation-protected-securities/</a></li>
<li>Internal Revenue Service — Publication 550: <a href="https://www.irs.gov/publications/p550">https://www.irs.gov/publications/p550</a></li>
</ul>
<p><em>This material is educational. Hypothetical yield and inflation assumptions are not current market quotations or investment recommendations.</em></p>
`,
  },
  {
    // Livio's own article for the US market (19 Oct 2026), published word for word.
    slug: "municipal-bonds-vs-treasuries",
    group: "us-municipal-vs-treasuries",
    section: "government",
    title: "Municipal Bonds vs. Treasury Bonds: Why the Highest Yield May Not Be the Best Comparison",
    seoTitle: "Municipal Bonds vs. Treasuries: Taxes and Yields",
    metaDescription: "Are municipal bonds better than Treasuries after taxes? Understand tax-equivalent yield, municipal credit risk and costs with practical examples.",
    primaryKeyword: "municipal bonds vs treasury bonds",
    published: "2026-10-19",
    bodyHtml: `
<p><em>For American bond investors, taxes can change the economics of a trade. A municipal bond yielding less than a Treasury may produce more spendable income, depending on the investor's circumstances.</em></p>
<p>Imagine comparing two bonds with similar maturities. A U.S. Treasury yields 4.2%, while a municipal bond yields 3.2%.</p>
<p>The Treasury appears more attractive. Its stated yield is a full percentage point higher, and its credit is backed by the U.S. government.</p>
<p>But an investor who pays a relatively high marginal federal income-tax rate may reach a different conclusion after taxes.</p>
<p>If the municipal bond's interest is exempt from federal income tax, its lower stated yield can translate into a higher after-tax income stream.</p>
<p>That is one reason the municipal bond market occupies a distinctive place in American fixed-income investing.</p>
<p>Unlike conventional <a href="/knowledge/corporate-bonds-vs-treasuries">corporate bond comparisons</a>, the central question is not only how much income the security generates, but how much of that income the investor keeps.</p>
<h2 id="what-are-municipal-bonds">What are municipal bonds?</h2>
<p>Municipal bonds are debt securities issued by state and local governments and by certain public authorities or related entities.</p>
<p>Their proceeds may finance infrastructure, transportation, schools, water systems and other public purposes. Some municipal bonds support the general financial obligations of a government, while others depend on revenue generated by a particular facility or project.</p>
<p>This distinction is important.</p>
<p>A general obligation bond may be supported by specified taxing powers or other general resources of the issuer. A revenue bond may rely primarily on the revenue produced by the financed project, subject to its governing documents.</p>
<p>The two securities can have different credit characteristics even when issued within the same jurisdiction.</p>
<p>Municipal bonds may pay fixed or variable interest, and their terms can include call provisions, sinking funds or other features affecting the timing of principal repayment.</p>
<p>For investors, the legal security behind the debt is at least as important as the identity of the issuing municipality.</p>
<h2 id="why-municipal-bond-yields-are-often-lower">Why municipal bond yields are often lower</h2>
<p>Many municipal bonds benefit from favorable federal income-tax treatment.</p>
<p>Under the applicable U.S. tax rules, interest on qualifying state and local government obligations is generally excluded from federal gross income.</p>
<p>That benefit changes the market price investors are willing to pay.</p>
<p>A taxpayer facing a high marginal federal income-tax rate may accept a lower nominal yield on a tax-exempt municipal bond because the income received is not reduced by federal income tax in the same way as taxable interest.</p>
<p>Investors in lower tax brackets may find the tax advantage less economically significant.</p>
<p>The relevant comparison therefore depends partly on the investor's tax circumstances.</p>
<p>However, not every municipal security is tax-exempt. Certain municipal issues produce taxable interest, and some bonds may have additional federal or state tax consequences.</p>
<p>The bond's tax status must be verified from its official documents rather than inferred from its name.</p>
<h2 id="tax-equivalent-yield-a-more-useful-comparison">Tax-equivalent yield: a more useful comparison</h2>
<p>Tax-equivalent yield translates the interest rate on a tax-exempt bond into the yield a fully taxable security would need to offer to produce equivalent after-tax income, under simplified assumptions.</p>
<p>The formula is:</p>
<p><strong>Tax-equivalent yield = Tax-exempt yield ÷ (1 − Marginal tax rate)</strong></p>
<p>Suppose a qualifying municipal bond yields 3.2% and the investor faces a 32% federal marginal tax rate.</p>
<p>Its simplified federal tax-equivalent yield is:</p>
<p><strong>3.2% ÷ (1 − 0.32) = 4.71%</strong></p>
<p>Under these assumptions, a fully federally taxable bond would need to yield approximately 4.71% to provide the same after-federal-tax income.</p>
<p>A Treasury yielding 4.2% would produce approximately 2.86% after a 32% federal income tax, while the qualifying municipal bond would retain its 3.2% federally tax-exempt yield.</p>
<table>
<thead><tr><th>Hypothetical investment</th><th>Yield before federal tax</th><th>Yield after 32% federal tax</th></tr></thead>
<tbody>
<tr><td>U.S. Treasury</td><td>4.20%</td><td>2.86%</td></tr>
<tr><td>Qualifying tax-exempt municipal bond</td><td>3.20%</td><td>3.20%</td></tr>
</tbody>
</table>
<p>In this simplified example, the municipal bond produces a higher after-federal-tax yield.</p>
<p>That calculation does not establish which security is preferable overall. It leaves out credit differences, state taxes, transaction costs and possible changes in the investor's tax circumstances.</p>
<h2 id="state-taxes-make-the-calculation-more-complicated">State taxes make the calculation more complicated</h2>
<p>Treasury interest is generally exempt from state and local income taxes, even though it is subject to federal income tax.</p>
<p>Municipal bond tax treatment varies.</p>
<p>In many circumstances, interest on municipal bonds issued within the investor's state of residence may receive favorable state income-tax treatment. Interest on obligations issued by other states may not receive the same exemption.</p>
<p>For a resident of a state with substantial income taxes, these differences can influence the after-tax comparison.</p>
<p>An investor comparing a home-state municipal bond with a Treasury therefore needs to examine the relevant federal and state rules, not merely apply one national tax rate.</p>
<p>Some municipal bonds may also have alternative minimum tax implications, depending on the nature of the issue and the applicable tax law.</p>
<p>This makes tax-equivalent yield a useful starting point rather than a complete answer.</p>
<h2 id="municipal-credit-risk-is-not-the-same-as-treasury-credit-risk">Municipal credit risk is not the same as Treasury credit risk</h2>
<p>The tax advantage of municipal bonds does not eliminate their credit risk.</p>
<p>Municipal issuers have different revenue sources, financial obligations, debt burdens and legal protections.</p>
<p>A financially strong municipality with diversified revenues is not economically identical to a single-purpose authority dependent on one revenue-generating facility.</p>
<p>A municipal bond's security may involve taxes, fees, utility revenues, project cash flows or other legally specified sources.</p>
<p>Credit ratings can help organize this information, but they do not substitute for understanding the issuer's financial condition and the structure of the obligation.</p>
<p><a href="/knowledge/treasury-bills-notes-bonds">U.S. Treasury securities</a>, by contrast, are backed by the federal government's full faith and credit.</p>
<p>Even when two securities have similar yields and duration, their credit risks should not be assumed to be equivalent.</p>
<h2 id="trading-costs-can-be-overlooked">Trading costs can be overlooked</h2>
<p>Individual municipal bonds may trade relatively infrequently.</p>
<p>Unlike widely traded benchmark Treasury securities, certain municipal issues can have limited secondary-market activity.</p>
<p>That affects the price an investor can obtain when buying or selling.</p>
<p>A quoted municipal yield may therefore not correspond exactly to the yield available to a retail investor executing a particular trade.</p>
<p>Dealer markups, markdowns and the difference between bid and ask prices can materially affect returns, especially for smaller transactions.</p>
<p>The relationship between tax savings and transaction costs deserves attention. A small annual tax advantage can lose much of its value when acquisition or sale expenses are unusually high.</p>
<p>The sensible comparison is therefore between executable prices and net cash flows, rather than headline yields viewed in isolation.</p>
<h2 id="duration-and-call-provisions-matter-too">Duration and call provisions matter too</h2>
<p>Municipal bonds are exposed to changes in market interest rates, just like Treasury and corporate bonds.</p>
<p>When required yields rise, the market prices of existing fixed-rate securities generally decline.</p>
<p>Duration measures the approximate sensitivity of those prices to changes in yields.</p>
<p>Some municipal bonds are also callable, allowing the issuer to redeem the securities before their stated maturity.</p>
<p>That option can become particularly relevant when interest rates fall. The issuer may choose to refinance existing debt, potentially shortening the investor's period of receiving the original coupon.</p>
<p>For callable bonds, yield to maturity alone can be insufficient. Yield to call and yield to worst may provide more useful additional information.</p>
<p>A high coupon is not automatically an attractive feature if the bond is trading at a premium and could be redeemed early.</p>
<h2 id="what-should-a-fair-comparison-include">What should a fair comparison include?</h2>
<p>Consider a municipal bond and a Treasury security with approximately five years remaining until maturity.</p>
<p>Start with their yields and after-tax treatment. Then examine duration, credit risk, liquidity and any embedded call options.</p>
<p>Only when those differences are visible can the extra income offered by one security be interpreted meaningfully.</p>
<p>An investor subject to a low marginal federal tax rate may see relatively little value in municipal tax exemptions. Another investor facing a much higher rate may find the after-tax yield comparison considerably different.</p>
<p>That is why simplified claims that municipal bonds are better or worse than Treasuries miss the central economic point.</p>
<p>The tax-equivalent calculation measures one dimension of value. The credit, maturity and liquidity analysis measures others.</p>
<h2 id="putting-bond-yields-in-context">Putting bond yields in context</h2>
<p>Municipal bonds illustrate a broader principle: the most informative bond comparison is rarely the one based on the highest advertised yield.</p>
<p>10BONDS focuses on making bond characteristics easier to compare. Its current bond finder covers euro-denominated government and corporate bonds, presenting a shortlist based on the duration and target yield selected by the user.</p>
<p>Although the platform does not currently offer a dedicated U.S. municipal bond database, its comparative approach reflects the same underlying principle: yield should be evaluated in the context of risk, maturity and market conditions.</p>
<p><a class="cta" href="/">Explore bond comparisons on 10BONDS.</a></p>
<h3 id="sources-and-further-reading">Sources and further reading</h3>
<ul>
<li>IRS — Publication 550, Investment Income and Expenses: <a href="https://www.irs.gov/publications/p550">https://www.irs.gov/publications/p550</a></li>
<li>SEC Investor.gov — Bonds and Fixed-Income Securities: <a href="https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds-or-fixed-income-products">https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds-or-fixed-income-products</a></li>
<li>Municipal Securities Rulemaking Board: <a href="https://www.msrb.org/">https://www.msrb.org/</a></li>
<li>EMMA Municipal Securities Disclosure Platform: <a href="https://emma.msrb.org/">https://emma.msrb.org/</a></li>
</ul>
<p><em>This article provides general educational information. Tax examples are simplified, and actual treatment depends on applicable laws and the investor's circumstances. No particular security is recommended.</em></p>
`,
  },
];
