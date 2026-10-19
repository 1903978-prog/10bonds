import type { KcSection } from "./knowledge";

// English versions of the published guides, for the international (English) Knowledge Center at /knowledge.
// Translated from the Italian originals (and Livio's own article); `group` matches the translation group of the
// Italian/French/German versions so the pages point to each other with hreflang.

export type EnGuide = { slug: string; group: string; section: KcSection; title: string; seoTitle: string; metaDescription: string; primaryKeyword: string; bodyHtml: string };

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
];
