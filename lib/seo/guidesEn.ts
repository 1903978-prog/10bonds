import type { KcSection } from "./knowledge";

// English versions of the published guides, for the international (English) Knowledge Center at /knowledge.
// Translated from the Italian originals (and the owner's own article); `group` matches the translation group of the
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
<p>Every bond comes with a sticker, and the sticker is misleading. The coupon tells you what the issuer promised to pay; the <strong>yield to maturity</strong> (YTM) tells you what you would actually earn each year if you bought the bond today at its market price, held it to the end and the issuer paid every coupon and returned the capital as agreed.</p>
<p>That is why professionals reach for it first. It squeezes the price you pay, the coupons you collect and the final repayment into one annual rate, so bonds with wildly different coupons, prices and maturities can finally be lined up on the same shelf. The catch is that it is the output of a calculation, and the calculation rests on a handful of assumptions. Each one deserves a moment of suspicion.</p>
<h2 id="coupon-and-yield">Coupon and yield to maturity are not the same thing</h2>
<p>The <strong>coupon</strong> is fixed on the day the bond is born and is calculated on its face value, usually 100. The <strong>price</strong> is a far more restless creature and changes every day. Buy below 100 and you pocket the difference when the bond is repaid; buy above 100 and that difference works against you. The yield to maturity blends both ingredients: the coupons, plus or minus the gap between what you paid and what you get back.</p>
<p>So two bonds with an identical 3% coupon can sport very different yields to maturity. What separates them is what they cost today and how long they still have to run.</p>
<p>The easiest way to remember it: the coupon belongs to the bond and never budges, while the yield to maturity belongs to the price you pay this morning, and moves every time that price does.</p>
<h2 id="formula">The formula</h2>
<p>Formally, the yield to maturity is the rate <em>y</em> at which today's price equals the present value of all the cash flows still to come:</p>
<p><em>Price = C/(1+y) + C/(1+y)² + … + (C+100)/(1+y)ⁿ</em></p>
<p>Here <em>C</em> is the annual coupon and <em>n</em> the number of years left. There is no tidy way to solve it directly. You find <em>y</em> by trial and error, which is precisely the drudgery spreadsheets perform with functions such as <em>IRR</em> or <em>YIELD</em>, and one of the few cases where letting the computer do your homework is entirely respectable.</p>
<p>Each term pulls one payment back to today's money, and the further off a payment sits, the harder it is discounted. The final term carries both the last coupon and the return of the face value.</p>
<h2 id="example">A step-by-step example</h2>
<p>Take a bond paying a 3% annual coupon, maturing in 5 years and trading at 95.</p>
<ul>
<li>Each year you collect 3 euros of coupon for every 100 of face value.</li>
<li>At maturity you are repaid 100, which is 5 euros more than you handed over.</li>
<li>The rate that makes 95 equal to the present value of those cash flows comes to roughly <strong>4.13%</strong> a year.</li>
</ul>
<p>For back-of-the-envelope work there is also an <strong>approximate formula</strong>, handy when the spreadsheet is at the office and you are not:</p>
<p><em>YTM ≈ (C + (100 − Price) / n) / ((100 + Price) / 2)</em></p>
<p>Plug in the example: (3 + 5/5) / 97.5 = 4.10%. Close enough to the exact answer to settle most dinner-table arguments.</p>
<p>The shortcut spreads the gain from the discount evenly across the remaining years and divides by the average of the purchase price and the repayment. It behaves well when the price is near 100 and grows less reliable for deep discounts or very long maturities.</p>
<h2 id="assumptions">The assumptions behind the yield to maturity</h2>
<p>Treat the yield to maturity as an estimate rather than a promise. It holds only if:</p>
<ul>
<li><strong>you keep the bond until maturity</strong>: sell earlier and your result depends on whatever the price happens to be that day;</li>
<li><strong>the issuer pays everything</strong>: a default costs you coupons and part of the capital (see the guide on <a href="/knowledge/bond-credit-risk">credit risk</a>);</li>
<li><strong>you reinvest each coupon at the same rate</strong>: in practice the reinvestment rate drifts;</li>
<li><strong>the bond is not repaid early</strong>: for callable bonds, the yield to the first call date matters too.</li>
</ul>
<h2 id="gross-and-net">Gross and net yield: the Italian rules</h2>
<p>The yields on 10BONDS are <strong>gross</strong>. In Italy, interest and capital gains on bonds normally bear a 26% substitute tax, cut to 12.5% for Italian government bonds, for those of countries that exchange information with Italy and for supranational issuers. What reaches your pocket is therefore smaller, and the taxman, it must be said, never misses a collection date. Check your own position with your bank or tax adviser.</p>
<p>Taxed elsewhere, you will face different rates and rules, but the logic does not change: compare bonds on the yield you would actually keep once tax and costs have taken their share.</p>
<h2 id="how-to-use-it">How to use the yield to maturity</h2>
<p>Never read the yield on its own. Pair it with the <a href="/knowledge/bond-duration">duration</a>, which shows how sharply the price reacts to interest rates, and with the rating, which gauges the issuer's risk. In the bond market a higher yield is almost never a free gift; it is usually a fee for extra risk.</p>
<p>To see what yields look like today, open the <a href="/">bond finder</a>: pick a duration and a target yield, say around 4% or a duration of about 5 years, and see which bonds come closest.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: set a duration and a target yield and see the 10 bonds that sit nearest to them.</p>
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
<p>If the yield is the headline, <strong>duration</strong> is the small print you ought to read next. It answers one blunt question: when interest rates move, how far does the price of my bond move with them?</p>
<p>Two bonds can offer exactly the same yield and still behave like strangers once the market starts to shift. Duration is how you tell them apart, which is why it should sit beside the yield in every comparison, like a chaperone.</p>
<h2 id="two-durations">Two kinds of bond duration</h2>
<p><strong>Macaulay duration</strong> is the average time until you receive the bond's cash flows (coupons and repayment), each weighted by its present value. It is measured in years and can never exceed the bond's remaining life, for the simple reason that the coupons turn up before the final repayment does.</p>
<p><strong>Modified duration</strong> is derived from it (divide by 1 + yield) and measures directly how sensitive the price is to interest rates. This is the version 10BONDS uses, and the one behind our sliders.</p>
<p>In conversation, anyone who says "duration" almost always means the modified kind, because it converts neatly into a percentage change in price.</p>
<h2 id="rule-of-thumb">The rule of thumb</h2>
<p>With a modified duration of <em>D</em> years, a one-percentage-point rise in market yields knocks roughly <em>D</em>% off the price. A one-point fall adds roughly <em>D</em>%.</p>
<ul>
<li>Duration 2: a 1% rise in rates costs about 2% of the price.</li>
<li>Duration 5: about 5%.</li>
<li>Duration 10: about 10%.</li>
</ul>
<p>An example: a 3% bond maturing in 5 years and yielding 4.13% has a Macaulay duration of about 4.7 years and a modified duration of about 4.5. The rule is reliable for small moves. For big ones, <strong>convexity</strong> enters the room and makes price gains slightly larger than price losses, which is one of the market's rare kindnesses.</p>
<p>Because the rule cuts both ways, duration is not just a gauge of danger. A long-duration bond suffers more when rates climb, and it also enjoys more when they fall.</p>
<h2 id="what-changes-it">What lengthens or shortens duration</h2>
<ul>
<li><strong>Maturity</strong>: the further off it is, the longer the duration.</li>
<li><strong>Coupon</strong>: generous coupons hand money back sooner, which shortens duration. A zero-coupon bond has a Macaulay duration equal to its remaining life.</li>
<li><strong>Level of yields</strong>: higher yields trim duration slightly.</li>
</ul>
<p>So two bonds maturing on the same day can carry different durations. The one with the fatter coupon returns more of your money along the way and is therefore a little less exposed when rates change.</p>
<h2 id="horizon">Duration and investment horizon</h2>
<p>If you already know when you will need the money, choosing a duration close to that date keeps the risk in check. Should rates rise, the price falls, but you reinvest the coupons at the higher rates, and the two effects tend to cancel out. Pair a short horizon with a long duration, however, and a rise in rates may leave you selling at a loss, rather like being forced to leave a party just as the bill arrives.</p>
<p>The duration slider in the <a href="/">bond finder</a> lets you compare bonds by band, for instance around 2 years, around 5 years or around 10 years.</p>
<h2 id="limits">What duration does not measure</h2>
<p>Duration captures <strong>interest rate risk</strong> and nothing else. It is silent on the issuer's health; for that you need the rating and the spread, both covered in the guide on <a href="/knowledge/bond-credit-risk">credit risk</a>. Nor does it work well for floating-rate or callable bonds, which respond to interest rates in their own way.</p>
<p>It is also a snapshot, not a portrait. Duration changes as time passes and yields move: a bond bought with a duration of 5 will have a shorter one a year later.</p>
<p>Put it next to the <a href="/knowledge/yield-to-maturity">yield to maturity</a> and the rating, and you hold the three numbers that tell you most of what matters about a bond.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: set the duration you need and the yield you are after.</p>
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
<p>The bond market has its own velvet rope, and <strong>investment grade</strong> is the right side of it. These are the bonds the rating agencies judge to carry a low risk of default, and the line matters more than any other in fixed income: a great many funds and institutional investors are simply not allowed to buy anything below it.</p>
<p>Know where the rope hangs, and what happens to an issuer who is shown out, and the yields on your screen start to make sense. So does the puzzle of why two bonds that look like twins can be priced as distant cousins.</p>
<p>What follows covers the rating scale used by the three main agencies, what a rating does and does not tell you, why the lowest investment grade rung draws so much attention, and how 10BONDS deals with bonds on which the agencies cannot agree.</p>
<h2 id="rating-scale">The rating scale</h2>
<p>The three main agencies use broadly similar scales. These grades count as investment grade:</p>
<table>
<thead><tr><th scope="col">S&amp;P and Fitch</th><th scope="col">Moody's</th><th scope="col">Assessment</th></tr></thead>
<tbody>
<tr><td>AAA</td><td>Aaa</td><td>Highest quality</td></tr>
<tr><td>AA+, AA, AA-</td><td>Aa1, Aa2, Aa3</td><td>Very high quality</td></tr>
<tr><td>A+, A, A-</td><td>A1, A2, A3</td><td>High quality</td></tr>
<tr><td>BBB+, BBB, BBB-</td><td>Baa1, Baa2, Baa3</td><td>Adequate quality</td></tr>
</tbody>
</table>
<p>From BB+ (Ba1 at Moody's) downwards, the market talks of <a href="/knowledge/high-yield-bonds">high yield</a>, or, less flatteringly, "speculative".</p>
<p>The plus and minus signs (Moody's prefers the numbers 1, 2 and 3) fine-tune the position within each band: A+ is a shade stronger than A, which is a shade stronger than A-.</p>
<h2 id="what-a-rating-says">What a rating really says</h2>
<p>A rating is the agency's opinion of how able the issuer is to pay its coupons and return the capital. It is not a guarantee, and it is certainly not a tip to buy. Over the years, defaults among investment grade issuers have been far rarer than among high yield ones, but rarer is not the same as never. Ratings move, too: an issuer can be downgraded while its bond sits quietly in your portfolio.</p>
<p>Treat the rating, then, as an opening statement rather than the final verdict, and weigh it alongside the spread and the structure of the bond, as the guide on <a href="/knowledge/bond-credit-risk">credit risk</a> explains.</p>
<h2 id="bbb-threshold">Why the BBB- threshold matters so much</h2>
<p>An issuer that slips from BBB- to BB+ becomes a <strong>fallen angel</strong>, a poetic name for a prosaic event. Many investors are then obliged to sell, and the price can drop further than the actual weakening of the credit would warrant. That is why BBB- bonds usually yield a touch more than A bonds: the market charges in advance for the chance of tumbling over the line.</p>
<p>The selling is driven by rulebooks, not by any overnight change in the company. Funds whose mandate permits only investment grade must cut or sell their holdings, whatever their managers privately think of the issuer.</p>
<h2 id="yield">What investment grade bonds yield</h2>
<p>An investment grade bond's yield depends on market rates, on its <a href="/knowledge/bond-duration">duration</a> and on its rating. As a rule, for the same duration, the lower the rating, the higher the yield. Today's figures are in the <a href="/">bond finder</a>, refreshed every day.</p>
<p>When comparing, hold the duration steady first, then watch how the yield climbs as the rating descends. The gap between bands is the extra return the market pays you for each extra helping of risk.</p>
<h2 id="agencies-disagree">When the agencies disagree</h2>
<p>Agencies are not a choir, and a bond can be BBB- for one and BB+ for another. On 10BONDS we show instead a risk score from 1 to 10, our own scale, which is not a credit rating. Unrated bonds do not appear in our lists. The details are in our methodology.</p>
<p>Split ratings crop up most often right beside the investment grade boundary, which is precisely where the difference counts. If you own such a bond, find out which rating your bank or fund goes by.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: set the minimum rating with the third slider and see the 10 bonds.</p>
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
<p>Buy a bond and you have, in effect, become somebody's bank manager. <strong>Credit risk</strong> is the chance that your borrower fails to pay the coupons or to hand back the capital, in full or in part. It is the dominant risk in corporate bonds, and the main reason some of them yield so much more than others.</p>
<p>No single number pins it down. Ratings, spreads and the structure of the bond each light up a different face of the same risk, while diversification is what stops one bad apple from spoiling a large part of the barrel.</p>
<p>Interest rate risk hits bonds of a similar duration in much the same way. Credit risk is personal: it belongs to each issuer. That is why it repays study bond by bond, and why spreading your money across issuers works so well against it.</p>
<h2 id="rating">The first indicator of bond credit risk: the rating</h2>
<p>Rating agencies boil credit risk down to a letter, from AAA to D. The key frontier runs between <a href="/knowledge/investment-grade-bonds">investment grade</a> (down to BBB-) and <a href="/knowledge/high-yield-bonds">high yield</a> (from BB+ downwards). Ratings are useful, but they often trail events, so use them as a starting point.</p>
<p>A rating records the agency's view as of its last review. Between reviews an issuer's fortunes can change, and the market, which never sleeps, usually reacts before the agencies have finished their coffee.</p>
<h2 id="spread">The second indicator: the spread</h2>
<p>The <strong>spread</strong> is the gap between a bond's yield and that of a near risk-free security of the same maturity, such as a German government bond. A wide spread means the market wants more compensation for lending to that issuer. If one issuer's spread rises far more than those of rivals with the same rating, the market is quietly clearing its throat about a problem.</p>
<p>Because it moves every day with prices, the spread is the freshest reading of the market's verdict on an issuer. It becomes really informative when set against issuers of similar rating and maturity.</p>
<h2 id="loss">How much you lose in a default</h2>
<p>A default is not automatically a total wipeout. How much you recover depends on:</p>
<ul>
<li><strong>seniority</strong>: <em>senior</em> bonds are repaid ahead of <em>subordinated</em> ones, and the latter yield more precisely because they recover less;</li>
<li><strong>collateral</strong>: bonds secured on specific assets (covered bonds, for instance) recover more;</li>
<li><strong>the issuer's sector and assets</strong>.</li>
</ul>
<p>Banks in the European Union add a further twist, the <strong>bail-in</strong>: in a crisis, the authorities can impose losses on bondholders, beginning with subordinated securities.</p>
<p>Hence two bonds from the same issuer can carry quite different risks. A senior bond and a subordinated bond from the same bank stand in different places in the queue if things go wrong, and in that queue, position is everything.</p>
<h2 id="diversify">The simplest remedy: diversify</h2>
<p>Spreading capital across several issuers, sectors and countries shrinks the damage any single issuer can do. That is why 10BONDS lists contain <strong>only one bond per issuer</strong>: ten bonds means ten different issuers.</p>
<p>Diversification does not abolish credit risk; it changes its shape. Instead of one default being able to knock out a large slice of the portfolio, each issuer accounts for only a fraction of it.</p>
<h2 id="yield-and-risk">Yield and risk go together</h2>
<p>For the same <a href="/knowledge/bond-duration">duration</a>, a higher yield is almost always the bill for higher credit risk. When a bond pays much more than others with the same rating, ask why before you ask how much. You can, for example, set investment grade bonds against high yield bonds in the <a href="/">bond finder</a>.</p>
<p>Even the <a href="/knowledge/yield-to-maturity">yield to maturity</a> takes for granted that the issuer pays everything. The higher the credit risk, the shakier that assumption becomes.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: use the rating slider to decide how much credit risk you are willing to carry.</p>
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
<p><strong>High yield</strong> bonds are the ones issued by companies rated below BBB- (Baa3 at Moody's). They pay fatter coupons and higher yields for a plain reason: investors are accepting a greater risk that the issuer will not be able to pay.</p>
<p>The trade also goes by the less cheerful name of "speculative grade". The extra return is genuine, but it travels with risks that the yield figure does not print on its label, and they are worth understanding before you start comparing numbers.</p>
<p>This guide looks at where the extra yield comes from, the main risks that come attached, why the bands inside high yield differ so sharply from one another, and what to check before setting one bond against another.</p>
<h2 id="why-they-yield-more">Why high yield bonds yield more</h2>
<p>The extra yield over government bonds, known as the <strong>spread</strong>, pays for three things: the probability of default, the expected loss if a default happens, and the greater difficulty of selling the bond. When the economy slows, high yield spreads widen quickly and prices fall. In that sense these bonds are part bond, part share, and they tend to remember the share part at the least convenient moment.</p>
<p>So the yield on the screen is not a forecast of what you will earn. It is the market's asking price for carrying the risk, and on average part of that extra yield is eaten up by the defaults that do occur.</p>
<h2 id="main-risks">The main risks</h2>
<ul>
<li><strong>Default</strong>: the biggest risk of all. In a poorly diversified portfolio, a single default can erase years of coupons.</li>
<li><strong>Liquidity</strong>: many issues are small and seldom traded, and the gap between buying and selling price can be wide.</li>
<li><strong>Early redemption</strong>: many high yield bonds are callable; if rates fall, the issuer can repay them and the expected yield never materialises.</li>
<li><strong>Downgrade</strong>: a further cut in the rating pushes the price down.</li>
</ul>
<p>These risks are sociable and like to arrive together. In a downturn, downgrades become more frequent, spreads widen and the bonds get harder to sell, all at once.</p>
<h2 id="bb-and-b">Not all high yield is the same</h2>
<p>The BB band sits closest to investment grade and has historically suffered far fewer defaults than the B and CCC bands. On 10BONDS the lowest rating you can choose is BB: the more speculative bands and unrated bonds never make it onto the page.</p>
<p>The step from <a href="/knowledge/investment-grade-bonds">investment grade</a> down to BB is the first rung on the ladder, and a very different step from the one between B and CCC. One is a kerb; the other is closer to a staircase.</p>
<h2 id="how-to-compare">How to compare high yield bonds</h2>
<p>Look at the rating, the <a href="/knowledge/bond-duration">duration</a> and the seniority before you look at the yield. Then set the spread against that of similar issuers: if a bond pays much more than others with the same rating, the market has spotted a specific risk. The guide on <a href="/knowledge/bond-credit-risk">credit risk</a> explains how to read the signal.</p>
<p>The <a href="/">bond finder</a> shows the highest yields every day, one bond per issuer. For a comparison with sturdier issuers, look at bonds yielding around 5% with a higher minimum rating.</p>
<p>Remember that a callable bond may be repaid before maturity, so for these bonds the <a href="/knowledge/yield-to-maturity">yield to maturity</a> is not the only figure that counts.</p>
<h2 id="how-much-weight">How much weight to give to high yield</h2>
<p>That depends on your circumstances, your goals and how much risk you can stomach, and it is a decision to take with a licensed adviser. One general rule does apply: the higher the yield you are chasing, the more it matters to spread your money across many issuers.</p>
<p>Nowhere in the bond market does diversification count for more, because each issuer's risk is larger and a single default weighs more heavily on the outcome.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: slide the rating down to BB and compare the yields.</p>
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
<p>Governments, like the rest of us, borrow, only they do it in bulk and call it issuing bonds. In the euro area the three biggest markets belong to Italy's <strong>BTPs</strong>, France's <strong>OATs</strong> and Germany's <strong>Bunds</strong>. Savers watch them and so does everyone else: German federal yields are the yardstick against which nearly every other euro bond is measured, and the famous <em>spread</em>, one of the few pieces of bond jargon to escape into everyday conversation, is simply the gap between the yield of the 10-year BTP and that of the German Bund of the same maturity.</p>
<h2 id="italy-btp">Italy: how a BTP works</h2>
<p><strong>BTPs</strong>, Buoni del Tesoro Poliennali, are how the Italian state funds itself over the medium and long term. A classic BTP pays a <strong>fixed coupon every six months</strong> and returns its face value at maturity, typically somewhere between 3 and 30 years away. You can buy one at issue, in the auctions run by the Ministry of Economy and Finance, or at any time on the secondary market (Borsa Italiana's MOT) through your bank or a broker. Once it trades, its price moves every day, which is why the <a href="/knowledge/yield-to-maturity">yield to maturity</a> drifts away from the coupon.</p>
<h3 id="italy-family">The family of Italian government securities</h3>
<ul>
<li><strong>BOT</strong>: maturity up to one year and no coupon; the return is the difference between the purchase price and the repayment.</li>
<li><strong>CTZ</strong>: short-term zero-coupon securities.</li>
<li><strong>CCT</strong>: a floating coupon tied to short-term market rates.</li>
<li><strong>BTP Italia</strong>: linked to Italian inflation (the FOI index excluding tobacco), built for savers, with a loyalty bonus in the issues that include one.</li>
<li><strong>BTP Valore</strong>: open only to individual savers during the placement period, with coupons that step up over time and a final bonus for those who hold to maturity.</li>
</ul>
<p>The terms of BTP Italia and BTP Valore change from one issue to the next, so read the official term sheet on the Italian Treasury Department's website before subscribing. Our tables show only fixed-coupon securities that can be compared like for like, apples with apples rather than apples with inflation-linked pears.</p>
<h3 id="italy-tax">Italian taxation and other advantages</h3>
<p>Under Italian rules, interest and capital gains on Italian government bonds are taxed at <strong>12.5%</strong>, compared with 26% on corporate bonds. Government bonds are also exempt from Italian inheritance tax and, within the limits set by law, left out of the ISEE (the Italian means-test indicator). For an Italian investor, the same gross yield on a BTP therefore leaves more in the pocket than on a corporate bond, a detail worth keeping in mind when comparing.</p>
<h2 id="france-oat">France: how an OAT works</h2>
<p><strong>OATs</strong>, Obligations Assimilables du Trésor, are the French state's medium and long-term debt. They are issued by the <strong>Agence France Trésor</strong> (AFT) and act as the reference for French interest rates: the 10-year OAT rate feeds through to mortgages, to the returns of euro-denominated life insurance funds and to what companies pay to borrow.</p>
<p>A classic OAT pays a <strong>fixed coupon once a year</strong> and repays its face value at maturity, anywhere from 2 to 50 years out. "Assimilable" means the AFT can reopen an existing line and issue fresh securities identical to the old ones, which keeps OATs very liquid. Private investors buy them on the secondary market through a bank or broker, or indirectly through funds and life insurance.</p>
<h3 id="france-inflation">OATi and OAT€i: inflation-linked OATs</h3>
<p>The <strong>OATi</strong> tracks French inflation excluding tobacco; the <strong>OAT€i</strong> tracks euro-area inflation excluding tobacco. Both capital and coupons are revalued in line with the price index, which protects against inflation running hotter than expected. Their "real" yield cannot be set directly against the nominal yield of a classic OAT, so they stay out of our tables.</p>
<h3 id="oat-bund-spread">The OAT-Bund spread</h3>
<p>The gap between the OAT yield and that of a German Bund of the same maturity is the premium investors want for lending to Paris rather than Berlin. It widens when the market frets about French public finances or politics, and narrows when nerves settle.</p>
<h2 id="germany-bund">Germany: Bunds, Bobls and Schätze</h2>
<p>German federal securities are issued by the <strong>German Finance Agency</strong> (Finanzagentur des Bundes) and are regarded as the safest bonds in the euro area, the fixed-income equivalent of a sensible pair of shoes.</p>
<ul>
<li><strong>Federal Treasury notes (Schätze)</strong>: 2-year maturity.</li>
<li><strong>Federal notes (Bobl)</strong>: 5-year maturity.</li>
<li><strong>Federal bonds (Bund)</strong>: maturities from 7 to 30 years, the 10-year being the celebrity of the family.</li>
<li><strong>Green federal securities</strong>: the money raised goes to climate and environmental projects; in every other respect they match their conventional "twins".</li>
</ul>
<p>All of them pay a fixed coupon once a year and repay the face value at maturity. Private investors buy them on the exchange through a bank or broker, or indirectly via bond funds and ETFs. The 10-year Bund yield is also where spreads start: the distance to Italian or French government bonds shows how the market rates their credit risk.</p>
<h2 id="risks">The risks of European government bonds</h2>
<p>First comes <strong>interest rate risk</strong>. When rates rise, bonds already in circulation lose value, and long maturities lose more (see the guide on <a href="/knowledge/bond-duration">duration</a>). Sell before maturity and you may get back less than you paid. The yield can also trail the rate of inflation.</p>
<p>Second comes <strong>credit risk</strong>, and here the three countries part company:</p>
<ul>
<li><strong>Germany</strong>: every major rating agency gives the federal government the top AAA rating.</li>
<li><strong>France</strong>: the agencies judge the French state's credit risk to be low, but France's rating has been cut in recent years, so OATs are not risk-free in the strict sense.</li>
<li><strong>Italy</strong>: Italy is rated in the BBB band, which is investment grade but not among the highest in the euro area. That is why BTPs yield more than German Bunds and French OATs.</li>
</ul>
<h2 id="taxation">Taxation in France and Germany</h2>
<p>For an individual resident in France, coupons and capital gains on an OAT held in a securities account are in principle subject to the single flat-rate levy (the "flat tax"), with the option of the progressive scale instead. The rate has changed in recent years, so check the one in force with your bank or on impots.gouv.fr.</p>
<p>In Germany, interest and capital gains bear the <strong>flat-rate withholding tax</strong> (Abgeltungsteuer) of 25%, plus the solidarity surcharge and church tax where they apply. Investment income up to the saver's allowance (Sparer-Pauschbetrag) is tax-free if an exemption order has been filed. Ask your bank or a tax adviser to check your own position. The yields on 10BONDS are always gross.</p>
<h2 id="how-to-compare">How to compare European government bonds</h2>
<p>Start with the horizon that fits you, then compare the yield curves maturity by maturity: the distance between the BTP or OAT curve and the Bund curve at each point is the spread. If you want more yield, set government bonds against corporate bonds of the same duration in the <a href="/">bond finder</a>. The guide <a href="/knowledge/government-vs-corporate-bonds">government or corporate bonds?</a> explains what changes when you do.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: pick the duration you need and see where BTPs, OATs and Bunds land among the 10 bonds.</p>
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
<p>It is one of the oldest debates at the Italian saver's kitchen table: lend to the state through a <strong>BTP</strong>, or lend to a company or bank through a <strong>corporate bond</strong>? No single answer suits everyone, but there is a sound method for comparing the two, and it settles more arguments than it starts.</p>
<p>The method works whichever government bond you begin with. Its five steps cover horizon, net yield, risk premium, rating and diversification, in that order.</p>
<p>The point is not to crown an overall champion. It is to make sure that when two bonds sit side by side, the gap in yield reflects a real difference in what you are being paid for, rather than a mere difference in maturity, tax treatment or name.</p>
<h2 id="same-horizon">1. Compare government and corporate bonds over the same horizon</h2>
<p>A 2-year BTP and a 10-year bond are not rivals; they are in different races. The second yields more simply because it is longer and more sensitive to interest rates. Choose the <a href="/knowledge/bond-duration">duration</a> that matches your horizon first, and only then compare yields within that band.</p>
<p>Compare across durations and you blend two separate risks, interest rate risk and credit risk, leaving no way to tell which of them the extra yield is rewarding.</p>
<h2 id="net-yield">2. Compare net yields</h2>
<p>The yields shown are gross. Under Italian rules, BTPs are taxed at 12.5% and corporate bonds at 26%. Take a BTP at 3.5% gross: it yields about 3.06% net. A corporate bond at 4% gross yields about 2.96% net. Here the BTP loses the gross contest and wins the one that matters, which is a little like losing the toss and winning the match.</p>
<p>Taxed in another country, you will face other rates, and the gap between government and corporate bonds may shrink or vanish altogether. The principle survives the journey: compare what you keep, not the headline figure.</p>
<h2 id="premium">3. Ask yourself how much premium you are receiving</h2>
<p>The difference in yield between a corporate bond and a BTP of the same duration is the company's <strong>risk premium</strong>. A few tenths of a point for an issuer rated below Italy is rarely generous pay; a wide premium on a solid issuer merits a closer look, though you should always ask why the market is demanding it. The guide on <a href="/knowledge/bond-credit-risk">credit risk</a> explains how to read the signal.</p>
<h2 id="rating">4. Look at the rating, not just the name</h2>
<p>Some large European companies are rated above the Italian state, and their bonds may yield less than BTPs. Others, household names among them, are <a href="/knowledge/high-yield-bonds">high yield</a>. Familiarity is a marketing achievement, not a measure of risk.</p>
<p>Read alongside the spread, the rating tells you far more than the logo does. A company whose products you know and love may still be carrying a heavy load of debt.</p>
<p>Set the company's rating against that of the government bond you have in mind. If the company is rated lower, its bond ought to pay a clear premium; if it is rated higher, a lower yield may be entirely reasonable.</p>
<h2 id="diversification">5. Think about diversification</h2>
<p>A portfolio of nothing but BTPs rests entirely on Italy. Adding bonds from other issuers, across sectors and countries, reduces your reliance on any single debtor. That is why 10BONDS lists show only one bond per issuer.</p>
<p>The same logic applies to any government: a portfolio of one country's bonds is concentrated on one debtor, however safe that debtor is thought to be. The guide on <a href="/knowledge/european-government-bonds">European government bonds</a> compares BTPs, OATs and Bunds.</p>
<h2 id="todays-data">Today's data</h2>
<p>Set BTPs against euro corporate bonds and <a href="/knowledge/investment-grade-bonds">investment grade</a> bonds in the <a href="/">bond finder</a>, refreshed every day.</p>
<p>Begin with the <a href="/knowledge/yield-to-maturity">yield to maturity</a>, hold the duration fixed and move the rating: the list shows how much extra yield each rung of risk is paying.</p>
<p><a class="cta" href="/">Find your 10 bonds</a>: set your horizon and target yield and see governments and companies compete in the same list.</p>
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
<p>Hunting for the best bonds in 2026 can feel like walking into a vast delicatessen without a shopping list: Italian and European government bonds, corporate bonds, short-dated issues and instruments that will not mature for more than a decade, all on the same counter.</p>
<p>So how do you compare them without simply picking the shiniest label?</p>
<p>The trick is to weigh <strong>yield to maturity, credit risk, maturity and purchase price</strong> together, never one at a time. A higher yield, on its own, is not proof of better terms; quite often it is the opposite.</p>
<h2 id="yield-to-maturity">1. Yield to maturity: the first indicator</h2>
<p>The yield to maturity (YTM) is the rate at which the purchase price equals the present value of all the future cash flows the security promises.</p>
<p>The nominal coupon ignores what you paid. The yield to maturity does not: it also captures the effect of the purchase price and of the final repayment.</p>
<p>A bond with a 3% annual coupon bought below par, for instance, can deliver a yield to maturity above 3%.</p>
<p>Buy the same bond above par, and the yield to maturity can slip below the coupon.</p>
<p>The figure assumes that the contractual cash flows are paid and that you hold the security to maturity. It is a calculation, not a guaranteed return.</p>
<h2 id="rating">2. Bond ratings: how to interpret risk</h2>
<p>Rating agencies grade the credit quality of issuers, rather as examiners grade students, though with longer reports and fewer resits.</p>
<p>Broadly, bonds fall into two camps:</p>
<table><thead><tr><th scope="col">Category</th><th scope="col">Indicative S&amp;P rating</th><th scope="col">Characteristics</th></tr></thead><tbody>
<tr><td>Investment grade</td><td>From AAA to BBB−</td><td>Relatively higher credit quality</td></tr>
<tr><td>Speculative grade</td><td>From BB+ to D</td><td>Generally higher credit risk</td></tr>
</tbody></table>
<p>A rating is a judgement on creditworthiness. It does not make the risk of default disappear.</p>
<p>Two bonds with exactly the same rating can still differ markedly in yield, liquidity, subordination and maturity, much as two people with the same school grades can lead very different lives.</p>
<h2 id="maturity">3. Which maturity to compare: 3, 5, 7 or 10 years?</h2>
<p>Remaining maturity is one of the numbers you cannot skip.</p>
<p>All else being equal, bonds that mature further away tend to be more sensitive to changes in interest rates.</p>
<p>That sensitivity has a name: duration.</p>
<p>Two terms are easily confused, so keep them apart:</p>
<ul><li><strong>Remaining maturity:</strong> the time left until contractual repayment.</li><li><strong>Duration:</strong> a measure of the sensitivity of the price to changes in market yields.</li></ul>
<p>A bond with ten years left to run does not necessarily have a duration of ten years; coupons paid along the way pull the figure down.</p>
<p>When comparing securities, then, look at maturity and duration together.</p>
<h2 id="btp-corporate">4. BTPs and corporate bonds: what are the differences?</h2>
<p>BTPs are debt securities issued by the Italian state.</p>
<p>Corporate bonds are issued by companies, which can come from almost any corner of the economy: industry, telecommunications, energy, financial services and more.</p>
<table><thead><tr><th scope="col">Feature</th><th scope="col">BTP</th><th scope="col">Corporate bonds</th></tr></thead><tbody>
<tr><td>Issuer</td><td>Italian state</td><td>Company</td></tr>
<tr><td>Credit risk</td><td>Linked to the Italian state</td><td>Linked to the issuer and to the structure of the security</td></tr>
<tr><td>Coupons</td><td>Depend on the type of BTP</td><td>Depend on the terms of issue</td></tr>
<tr><td>Ordinary Italian taxation</td><td>Generally 12.5% on relevant income</td><td>Generally 26%, with exceptions</td></tr>
<tr><td>Liquidity</td><td>Varies by issue</td><td>Varies by issue</td></tr>
</tbody></table>
<p>When a corporate bond pays more, the extra may be compensation for higher credit risk, thinner liquidity or some other feature tucked into the contract. Rarely is it simple generosity.</p>
<h2 id="five-elements">5. Five elements to check before comparing two bonds</h2>
<p>A fair comparison covers five things:</p>
<ol><li><strong>Yield to maturity:</strong> what the market price pays, on the assumptions built into the calculation.</li><li><strong>Rating and credit risk:</strong> how creditworthy the issuer is.</li><li><strong>Maturity and duration:</strong> how long the investment runs and how its price may react to interest rates.</li><li><strong>Liquidity:</strong> how easily the security could be sold before maturity.</li><li><strong>Costs and taxation:</strong> how much they may eat into the return you actually take home.</li></ol>
<h2 id="simple-comparison">6. How to compare bonds more simply</h2>
<p>Leafing through dozens of instruments one by one is a fine way to lose an evening. A comparison platform can line up the same information using consistent criteria instead.</p>
<p>Our tool asks you for just two settings:</p>
<ul><li>Risk level.</li><li>Desired maturity.</li></ul>
<p>It then returns a comparative selection of ten bonds, with their yields, ratings and maturities, chosen according to a documented methodology.</p>
<p><a class="cta" href="/">Compare bonds</a></p>
<h2 id="faq">Frequently asked questions</h2>
<h3>Are the bonds with the highest yield also the best value?</h3>
<p>Not necessarily. A high yield can be the market's way of pricing greater credit, liquidity or structural risk.</p>
<h3>Can you lose money with an investment grade bond?</h3>
<p>Yes. A rating does not guarantee repayment, and the market price can fall.</p>
<h3>What happens if I sell before maturity?</h3>
<p>You receive whatever the market will pay on that day. Depending on conditions, that can mean a capital gain or a capital loss.</p>
<h3>Are yield to maturity and coupon the same thing?</h3>
<p>No. The coupon is the periodic payment written into the contract; the yield to maturity also factors in the purchase price and the expected cash flows up to repayment.</p>
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
<p>Both will get you into the bond market, but they take different roads. A BTP is a single bond issued by the Italian state: one borrower, one contract. A bond ETF is an exchange-traded fund holding a basket of bonds: a set menu rather than a single dish.</p>
<h2 id="maturity">Maturity and repayment</h2>
<p>A traditional BTP comes with a fixed maturity date and clear repayment terms. A traditional bond ETF usually runs a rolling portfolio, so there is no single day on which it hands your money back.</p>
<p>Fixed-maturity bond ETFs also exist, and they behave differently from the traditional kind.</p>
<h2 id="diversification">Diversification</h2>
<p>A single BTP is a specific bet on Italian government debt. An ETF can spread your money over several issuers and maturities, depending on what it holds.</p>
<h2 id="costs-and-risks">Costs and risks</h2>
<p>When weighing a BTP against a bond ETF, look at:</p>
<ul><li>Trading commissions.</li><li>The fund's ongoing charges, where applicable.</li><li>The bid-ask spread.</li><li>Sensitivity to interest rates.</li><li>Credit risk.</li><li>Tax treatment.</li></ul>
<p>No answer fits every investor: the two are built differently, and small costs, like small leaks, are the easiest to overlook.</p>
<p><a class="cta" href="/">Explore the yield and risk of individual bonds</a></p>`,
  },
  {
    slug: "bond-default-rates-by-rating",
    group: "default-rates",
    section: "risk",
    title: "What is the historical default probability of a BBB rating?",
    seoTitle: "Default probability by rating: BBB, A, BB and more",
    metaDescription: "Historical default probability by rating, from AAA to CCC: BBB issuers defaulted in 1.40% of cases over 5 years and 3.40% over 10 years (long-run averages).",
    primaryKeyword: "default probability bbb rating",
    bodyHtml: `
<p><strong>Short answer:</strong> according to public historical default studies, a BBB-rated issuer defaulted in 0.15% of cases within 1 year, 1.40% within 5 years and 3.40% within 10 years. Put 100 BBB issuers in a room, come back ten years later, and on average fewer than 4 will have failed to pay.</p>
<p>The table below gives average cumulative default rates for every rating notch, over horizons from 1 to 15 years. A cumulative rate is the share of issuers holding that rating at the start of the period that had defaulted by its end.</p>
<h2 id="table">Cumulative default rates by rating (%)</h2>
<table><thead><tr><th scope="col">Rating</th><th scope="col">10BONDS risk</th><th scope="col">1 year</th><th scope="col">3 years</th><th scope="col">5 years</th><th scope="col">7 years</th><th scope="col">10 years</th><th scope="col">15 years</th></tr></thead><tbody>
<tr><td>AAA</td><td>1</td><td>0.00%</td><td>0.01%</td><td>0.07%</td><td>0.17%</td><td>0.31%</td><td>0.51%</td></tr>
<tr><td>AA+</td><td>2</td><td>0.00%</td><td>0.04%</td><td>0.14%</td><td>0.26%</td><td>0.46%</td><td>0.69%</td></tr>
<tr><td>AA</td><td>2</td><td>0.01%</td><td>0.07%</td><td>0.20%</td><td>0.36%</td><td>0.60%</td><td>0.97%</td></tr>
<tr><td>AA−</td><td>2</td><td>0.03%</td><td>0.12%</td><td>0.30%</td><td>0.49%</td><td>0.78%</td><td>1.20%</td></tr>
<tr><td>A+</td><td>3</td><td>0.04%</td><td>0.17%</td><td>0.38%</td><td>0.62%</td><td>1.10%</td><td>1.80%</td></tr>
<tr><td>A</td><td>3</td><td>0.05%</td><td>0.21%</td><td>0.48%</td><td>0.80%</td><td>1.40%</td><td>2.20%</td></tr>
<tr><td>A−</td><td>3</td><td>0.07%</td><td>0.28%</td><td>0.59%</td><td>0.98%</td><td>1.70%</td><td>2.60%</td></tr>
<tr><td>BBB+</td><td>4</td><td>0.10%</td><td>0.44%</td><td>0.93%</td><td>1.50%</td><td>2.40%</td><td>3.90%</td></tr>
<tr><td>BBB</td><td>5</td><td>0.15%</td><td>0.65%</td><td>1.40%</td><td>2.10%</td><td>3.40%</td><td>5.30%</td></tr>
<tr><td>BBB−</td><td>6</td><td>0.26%</td><td>1.10%</td><td>2.40%</td><td>3.70%</td><td>5.50%</td><td>8.00%</td></tr>
<tr><td>BB+</td><td>7</td><td>0.41%</td><td>1.80%</td><td>3.60%</td><td>5.40%</td><td>7.90%</td><td>11.20%</td></tr>
<tr><td>BB</td><td>7</td><td>0.63%</td><td>2.70%</td><td>5.20%</td><td>7.60%</td><td>10.80%</td><td>14.80%</td></tr>
<tr><td>BB−</td><td>7</td><td>1.00%</td><td>4.30%</td><td>8.00%</td><td>11.20%</td><td>15.20%</td><td>20.10%</td></tr>
<tr><td>B+</td><td>8</td><td>1.60%</td><td>6.00%</td><td>10.30%</td><td>14.00%</td><td>18.40%</td><td>23.80%</td></tr>
<tr><td>B</td><td>8</td><td>2.60%</td><td>8.80%</td><td>14.00%</td><td>18.20%</td><td>23.10%</td><td>28.50%</td></tr>
<tr><td>B−</td><td>8</td><td>4.60%</td><td>13.20%</td><td>19.70%</td><td>24.50%</td><td>29.90%</td><td>35.40%</td></tr>
<tr><td>CCC+</td><td>9</td><td>12.00%</td><td>24.50%</td><td>32.30%</td><td>37.40%</td><td>42.60%</td><td>47.50%</td></tr>
<tr><td>CCC / C</td><td>9–10</td><td>24.50%</td><td>38.90%</td><td>45.60%</td><td>49.80%</td><td>54.10%</td><td>58.00%</td></tr>
</tbody></table>
<p><em>Source: 10BONDS, based on public historical default studies: average cumulative corporate default rates by rating notch (long-run historical averages, combined and rounded). The "10BONDS risk" column shows which 1-10 risk score each rating corresponds to in our bond finder.</em></p>
<h2 id="how-to-read">How to read the default probability table</h2>
<p>Default probability climbs as the rating falls, and it does not climb politely in a straight line. At 5 years it moves from 1.40% for BBB to 2.40% for BBB−, then leaps to 5.20% for BB, the first fully speculative-grade notch. The border between investment grade (down to BBB−) and speculative grade (BB+ and below) is where risk stops strolling and starts to jog.</p>
<p>Time counts as much as the rating. A 1-year probability and a 10-year one are different animals: for a BBB bond maturing in 5 years, the column that matters is the 5-year one.</p>
<h2 id="limits">What the table does not tell you</h2>
<ul><li>These are historical averages across many issuers and economic cycles, not a prediction for any one issuer.</li><li>A default is not necessarily a total loss: what you recover depends on the bond's seniority and collateral.</li><li>The data covers companies; government bonds have a default history of their own.</li></ul>
<p>To see how ratings, default probability and expected loss fit together, read the guides on <a href="/knowledge/bond-credit-risk">bond credit risk</a> and <a href="/knowledge/investment-grade-bonds">investment-grade bonds</a>.</p>
<p><a class="cta" href="/">Compare bonds by risk, yield and duration</a></p>`,
  },
  {
    // The owner's own article for the US market (19 Oct 2026), published word for word.
    slug: "treasury-bills-notes-bonds",
    group: "us-treasuries",
    section: "government",
    title: "Treasury Bills vs. Notes vs. Bonds: Understanding What You're Actually Buying",
    seoTitle: "Treasury Bills vs Notes vs Bonds: Maturities, Yields, Taxes",
    metaDescription: "T-bills, Treasury notes and Treasury bonds compared: maturities, coupons, yield to maturity, duration risk and how Treasury interest is taxed.",
    primaryKeyword: "treasury bills vs notes vs bonds",
    published: "2026-10-19",
    bodyHtml: `
<p><strong>A field guide to Treasury maturities, yields, taxes and the risks that actually matter.</strong></p>
<p>U.S. Treasury securities enjoy the sort of reputation most borrowers can only dream of: among the safest investments money can buy. They carry the full faith and credit of the federal government, and they sit in portfolios belonging to everyone from cautious individual savers to central banks. The catch is that “Treasury” is a family name rather than a description, and the relatives behave very differently.</p>
<p>A three-month Treasury bill and a 30-year Treasury bond share an issuer and not much else. The first is back in your account as cash within weeks, often before you have got round to reading the confirmation. The second can swing substantially in price whenever interest rates change their mind. Both carry the credit of the U.S. government; that does not make their investment outcomes interchangeable.</p>
<p>The sensible place to start is the date on which each one hands your money back.</p>
<h2 id="essential-differences">Treasury bills, notes and bonds: the essential differences</h2>
<p>The Treasury sorts its marketable fixed-rate securities into three main drawers.</p>
<p><strong>Treasury bills</strong>, known to almost everyone as T-bills, mature in one year or less. They make no regular coupon payments. Investors generally buy them at a discount to face value and collect the full face value at maturity, and the gap between the two is the interest income.</p>
<p><strong>Treasury notes</strong> are issued with original maturities of two, three, five, seven or ten years. They pay a fixed coupon every six months and return the principal at the end.</p>
<p><strong>Treasury bonds</strong> come with original maturities of 20 or 30 years. Like notes, they generally pay interest semiannually; they simply expect you to stick around for a good deal longer.</p>
<table>
<thead><tr><th>Security</th><th>Original maturity</th><th>Interest structure</th></tr></thead>
<tbody>
<tr><td>Treasury bill</td><td>4–52 weeks</td><td>Generally issued at a discount</td></tr>
<tr><td>Treasury note</td><td>2–10 years</td><td>Fixed semiannual coupons</td></tr>
<tr><td>Treasury bond</td><td>20 or 30 years</td><td>Fixed semiannual coupons</td></tr>
</tbody>
</table>
<p>All three can be sold before maturity. What a buyer will pay for them on the day, however, depends on market conditions at the time.</p>
<p>One subtlety catches out a surprising number of people: the Treasury's labels describe the maturity at the moment of issue. A Treasury bond issued 25 years ago may have only five years left before repayment. For someone buying it today, that remaining life usually matters far more than the name on the tin.</p>
<h2 id="coupon-vs-return">Why a higher coupon doesn't necessarily mean a higher return</h2>
<p>Put two Treasury notes side by side. The first carries a 4% coupon; the second pays 2%.</p>
<p>The instinct is to crown the first and move on. The instinct, unfortunately, has not looked at the price.</p>
<p>Treasuries trade in the secondary market, where prices adjust as interest rates move. An older note with a 2% coupon may change hands below face value if newly issued securities offer higher yields, and that discount can make up to a buyer for the thinner coupon payments.</p>
<p>Run the film backwards and a note paying a 4% coupon may trade above face value when market yields are lower.</p>
<p>That is why professional bond comparisons rest on <strong>yield to maturity</strong> and treat the coupon as only part of the story.</p>
<p>Yield to maturity folds together the price paid, the remaining coupons, the repayment amount and the time left until maturity. It gives fixed-rate obligations a common yardstick, on the assumption that the promised payments are made.</p>
<p>For Treasuries bought between coupon dates, accrued interest and settlement conventions also enter the sum. The quote on a brokerage screen is where the arithmetic of what you actually pay begins, not where it ends.</p>
<h2 id="long-term-risk">The overlooked risk of long-term Treasuries</h2>
<p>A Treasury bill and a Treasury bond carry the credit risk of one and the same federal government. Their exposure to interest-rate movements, on the other hand, can be dramatically different.</p>
<p>Picture buying a 30-year Treasury bond and then watching market yields rise by one percentage point.</p>
<p>The coupon is fixed, so the only thing left to adjust is the price, which has to fall until the bond offers new buyers a competitive yield. For a long-duration security the drop can be substantial, the kind that makes people read their statement twice in the hope that it changes.</p>
<p>Now picture a Treasury bill that matures in three months. Its market value may twitch as well, but with so little life left, its sensitivity to the same rate change is generally much smaller.</p>
<p>The gap between the two is measured by <strong>duration</strong>.</p>
<p>Duration is not simply the number of years until repayment. It is a measure of how sensitive a bond's price is to a change in yield.</p>
<p>A security with a modified duration of eight years, for example, could see its price fall by roughly 8% after a one-percentage-point rise in yield, before convexity and other market effects are taken into account.</p>
<p>None of this means a long-term Treasury necessarily loses money if held to maturity. Provided the Treasury meets its payment obligations, the contractual coupons and the redemption amount stay exactly as defined. An investor who has to sell early, though, may realize a gain or loss that bears little resemblance to the original yield-to-maturity calculation.</p>
<p>Predictable contractual cash flows on one side, unpredictable market prices along the way on the other: that distinction is the bedrock of bond investing.</p>
<h2 id="taxes">Are Treasury securities tax-free?</h2>
<p>Not entirely, although they get closer than most.</p>
<p>Interest on Treasury bills, notes and bonds is generally subject to <strong>federal income tax</strong>, but exempt from state and local income taxes.</p>
<p>For investors living in states with relatively high income-tax rates, that exemption is a good deal more than a footnote.</p>
<p>A Treasury and a corporate bond with identical headline yields can therefore leave their owners with different after-tax results, because their interest income may be treated differently.</p>
<p>U.S. investors should also keep Treasuries separate in their minds from <a href="/knowledge/municipal-bonds-vs-treasuries">municipal bonds</a>, whose interest may qualify for federal and sometimes state tax exemptions, depending on the security and the investor's circumstances.</p>
<p>Buying a Treasury above or below par can bring further tax rules into play, so a quick after-tax comparison of coupon rates is not always enough.</p>
<h2 id="what-to-compare">What should investors compare?</h2>
<p>Take two securities with roughly five years left to maturity: a Treasury note and an <a href="/knowledge/corporate-bonds-vs-treasuries">investment-grade corporate bond</a>.</p>
<p>If the corporate bond yields more, the extra is not a present. It may be compensation for corporate credit risk, thinner liquidity or particular contractual features.</p>
<p>The Treasury yield makes a handy reference point. The gap between the two yields is one way of reading how much extra the market demands for the trouble.</p>
<p>A meaningful comparison therefore starts with remaining maturity and duration, and only then turns to yield, credit quality and trading costs.</p>
<p>It is a less thrilling method than hunting for the biggest coupon on the screen, and a far more informative one.</p>
<h2 id="explore">A better way to explore fixed-income securities</h2>
<p>The market offers thousands of bonds, government and corporate, in every combination of maturity and risk one could reasonably invent and several one could not.</p>
<p>10BONDS is built to make that crowd manageable. Choose a desired duration and yield, and you get a shortlist of bonds with comparable characteristics, together with their yield, duration and credit-risk information.</p>
<p>The aim is to make the differences between securities easier to see. It is not to replace the judgment that an investment decision requires.</p>
<p><a class="cta" href="/">Explore bonds by duration and yield on 10BONDS.</a></p>
<h3 id="sources">Sources and further reading</h3>
<ul>
<li>U.S. Treasury — Treasury Notes: <a href="https://treasurydirect.gov/marketable-securities/treasury-notes/">https://treasurydirect.gov/marketable-securities/treasury-notes/</a></li>
<li>U.S. Treasury — Treasury Bills: <a href="https://treasurydirect.gov/marketable-securities/treasury-bills/">https://treasurydirect.gov/marketable-securities/treasury-bills/</a></li>
<li>U.S. Treasury — Understanding Pricing and Interest Rates: <a href="https://www.treasurydirect.gov/marketable-securities/understanding-pricing/">https://www.treasurydirect.gov/marketable-securities/understanding-pricing/</a></li>
<li>Internal Revenue Service — Topic 403, Interest Received: <a href="https://www.irs.gov/taxtopics/tc403">https://www.irs.gov/taxtopics/tc403</a></li>
</ul>
<p><em>This article is for general financial education. It is not personalized investment advice, nor a recommendation to buy any particular security.</em></p>
`,
  },
  {
    // The owner's own article for the US market (19 Oct 2026), published word for word.
    slug: "corporate-bonds-vs-treasuries",
    group: "us-corporate-vs-treasuries",
    section: "government",
    title: "Corporate Bonds vs. Treasury Bonds: What Are You Really Being Paid For?",
    seoTitle: "Corporate Bonds vs. Treasury Bonds: Yield and Risk",
    metaDescription: "Why do corporate bonds pay more than Treasuries? Compare credit spreads, duration, liquidity, taxes and the risks behind higher yields.",
    primaryKeyword: "corporate bonds vs treasury bonds",
    published: "2026-10-19",
    bodyHtml: `
<p><em>Two bonds can mature on the same day and pay very different yields. The gap between them is a short story about risk, liquidity and what investors will pay for a quiet night's sleep.</em></p>
<p>Open your brokerage account and suppose you find two bonds with about five years left to run. One is issued by the U.S. Treasury and yields 4%. The other comes from a large American corporation and yields 5.2%.</p>
<p>Both promise regular interest payments and the return of principal at maturity. Both are in dollars. Both have similar durations. On paper they could be twins.</p>
<p>The corporate bond offers an extra 1.2 percentage points of annualized yield. On a $100,000 position, that looks rather like $1,200 a year for doing nothing in particular.</p>
<p>The arithmetic is the easy part. Working out what the extra yield is actually paying you for is where things get interesting.</p>
<p>The corporate bond yields more for a simple reason: you are not buying the same financial promise.</p>
<h2 id="the-treasury-yield-as-a-starting-point">The Treasury yield as a starting point</h2>
<p><a href="/knowledge/treasury-bills-notes-bonds">U.S. Treasury securities</a> are backed by the full faith and credit of the federal government. They sit at the centre of global financial markets, and their yields serve as the reference rates against which a great deal of other debt is valued.</p>
<p>A Treasury yield reflects several forces at once: expected interest rates, inflation, the maturity of the obligation and the balance between supply and demand.</p>
<p>Corporate bondholders live with those same broad forces, plus a question Treasury holders rarely lose sleep over: will this particular business keep generating enough cash to repay its debt?</p>
<p>The price markets put on that question has a name: the <em>credit spread</em>.</p>
<p>At its simplest, the spread is the difference between the yield on a corporate bond and the yield on a comparable Treasury security.</p>
<p>If a corporate bond yields 5.2% and a comparable Treasury yields 4%, the quoted difference is 120 basis points, one basis point being 0.01 percentage points.</p>
<p>The spread is a useful first look at what the market pays you for risks a Treasury does not carry. It is not, however tempting it may be to read it that way, a direct measure of the probability that the issuer will default.</p>
<h2 id="what-the-credit-spread-really-contains">What the credit spread really contains</h2>
<p>The obvious ingredient is credit risk.</p>
<p>A company can run into falling revenue, rising borrowing costs, tougher competitors or financial difficulties that weaken its ability to meet its debt obligations. Investors generally want additional yield for shouldering that uncertainty.</p>
<p>Credit risk, though, does not account for the whole spread.</p>
<p>Corporate bonds may trade far less often than Treasuries. An investor who needs to sell in a hurry can struggle to find a buyer at a satisfactory price, so part of the higher yield may be compensation for reduced liquidity.</p>
<p>The structure of the security matters too. A senior unsecured bond, a subordinated bond and a callable bond from the same company can carry materially different risks, rather like three tickets to the same concert with very different views of the stage.</p>
<p>Finally, spreads carry the market's mood. In periods of financial stress, investors often demand more for corporate credit exposure even when individual companies have not materially changed.</p>
<p>A credit spread is therefore best read as a market price for several kinds of risk bundled together, not as a tidy calculation of expected default losses.</p>
<h2 id="why-a-credit-rating-doesn-t-tell-the-whole-story">Why a credit rating doesn't tell the whole story</h2>
<p>Credit rating agencies set out to assess the relative creditworthiness of issuers and of the instruments they sell.</p>
<p>On the S&amp;P scale, investment-grade ratings generally run from AAA to BBB−. Anything below BBB− falls into the speculative-grade category.</p>
<p>The categories are useful. They are not a precise forecast of returns, and mistaking one for the other is a common and occasionally expensive habit.</p>
<p>Take two hypothetical BBB-rated companies. One runs a steady business with recurring revenue and relatively modest financial leverage. The other works in a cyclical industry where earnings lurch about with the economy.</p>
<p>Their ratings may land in the same category while their bonds trade at different spreads.</p>
<p>Features of the individual bond widen the gap further. Seniority, guarantees, covenants and recovery prospects all shape what happens to bondholders if the issuer gets into trouble.</p>
<p>So the useful question for anyone comparing corporate bonds is not merely whether a security carries an investment-grade rating. It is whether its yield fairly reflects the particular mix of risks packed into that specific issue.</p>
<h2 id="a-worked-example-how-much-additional-yield-is-enough">A worked example: how much additional yield is enough?</h2>
<p>Back to the two hypothetical five-year bonds.</p>
<table>
<thead><tr><th>Characteristic</th><th>Treasury</th><th>Corporate bond</th></tr></thead>
<tbody>
<tr><td>Yield to maturity</td><td>4.00%</td><td>5.20%</td></tr>
<tr><td>Remaining maturity</td><td>5 years</td><td>5 years</td></tr>
<tr><td>Credit issuer</td><td>U.S. government</td><td>Corporation</td></tr>
<tr><td>Additional yield</td><td>—</td><td>1.20 percentage points</td></tr>
</tbody>
</table>
<p>Suppose, purely for illustration, that the corporate issuer has a cumulative five-year default probability of 3%, and that a default would wipe out 60% of the investment's exposure.</p>
<p>The simplified expected credit loss over the five-year horizon would then come to 1.8% of exposure.</p>
<p>That is not a reliable forecast of the bond's annual return. It ignores when a default might happen, how much the investor has already pocketed in coupons, shifts in recovery assumptions and the time value of money.</p>
<p>What it does show is that gross yield cannot be judged in isolation from potential credit losses.</p>
<p>The extra 1.2 percentage points of quoted annual yield is not a guaranteed excess return. Part of the spread pays investors for living with uncertainty, including losses that may be rare but substantial when they arrive.</p>
<p>A more rigorous comparison would look at annualized default assumptions, recovery estimates, the bond's cash-flow schedule and the market value of both securities.</p>
<h2 id="interest-rate-risk-still-matters">Interest-rate risk still matters</h2>
<p>It is tempting to file Treasuries under “safe” and corporate bonds under “risky” and call it a day. Real portfolios are less tidy than filing cabinets.</p>
<p>A long-duration Treasury bond can swing substantially in price when market interest rates change. A short-duration investment-grade corporate bond may be less sensitive to general rate movements, even though it brings extra credit risk along with it.</p>
<p>Maturity alone is not always enough for a fair comparison. Duration is the better measure of price sensitivity.</p>
<p>A bond with a modified duration of six years, for instance, might lose roughly 6% in price if its required yield rises by one percentage point, before convexity and other effects.</p>
<p>For a corporate bond, that required yield can rise because Treasury yields go up, because its credit spread widens, or because both happen at once, which is the bond market's version of being rained on from two directions.</p>
<p>Keeping interest-rate exposure and credit-spread exposure apart is therefore essential.</p>
<h2 id="liquidity-and-transaction-costs">Liquidity and transaction costs</h2>
<p>The U.S. Treasury market is exceptionally large and generally liquid, particularly for recently issued benchmark securities.</p>
<p>Corporate bond liquidity is a patchwork by comparison.</p>
<p>Two issues from the same company can trade with very different frequency and bid-ask spreads. Smaller orders may also get less favorable execution than institutional ones.</p>
<p>The yield displayed on a financial website is not necessarily the yield an individual investor can actually obtain.</p>
<p>The real execution price, any dealer markup or markdown, and transaction charges can all change the effective return.</p>
<p>That matters most when the securities being compared differ by only a few basis points, a margin that costs can swallow before anyone notices.</p>
<h2 id="taxes-can-change-the-comparison">Taxes can change the comparison</h2>
<p>Interest on Treasury securities is generally subject to federal income tax but exempt from state and local income taxes.</p>
<p>Corporate bond interest is generally subject to federal income tax and may be taxed at the state and local level as well.</p>
<p>For an investor paying significant state income tax, that difference can shrink the corporate bond's apparent advantage.</p>
<p>The right calculation depends on the investor's tax position and on the characteristics of the securities. Pre-tax quoted yields cannot settle, on their own, which one leaves more in the investor's pocket after tax.</p>
<h2 id="comparing-bonds-rather-than-headlines">Comparing bonds rather than headlines</h2>
<p>The central lesson is that the highest quoted yield is not necessarily the most attractive outcome once risk is counted.</p>
<p>An informative comparison weighs yield, duration, credit quality, seniority, liquidity and costs together, rather than one at a time.</p>
<p>That is the thinking behind 10BONDS. Instead of treating bonds as interchangeable products, the platform organizes available euro-denominated government and corporate securities by their financial characteristics.</p>
<p>Users can see how bonds with similar durations differ in yield and credit risk, without treating the resulting shortlist as a personalized investment recommendation.</p>
<p><a class="cta" href="/">Explore bond yields, duration and risk on 10BONDS.</a></p>
<h3 id="sources-and-further-reading">Sources and further reading</h3>
<ul>
<li>SEC Investor.gov — Corporate Bonds: <a href="https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds-or-fixed-income-products">https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds-or-fixed-income-products</a></li>
<li>SEC Investor.gov — What Are Corporate Bonds?: <a href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/what-are">https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/what-are</a></li>
<li>U.S. Treasury — Understanding Pricing and Interest Rates: <a href="https://www.treasurydirect.gov/marketable-securities/understanding-pricing/">https://www.treasurydirect.gov/marketable-securities/understanding-pricing/</a></li>
<li>IRS — Publication 550, Investment Income and Expenses: <a href="https://www.irs.gov/publications/p550">https://www.irs.gov/publications/p550</a></li>
</ul>
<p><em>This article is for general financial education. The numerical examples are hypothetical and do not represent available investment opportunities or recommendations.</em></p>
`,
  },
  {
    // The owner's own article for the US market (19 Oct 2026), published word for word.
    slug: "tips-vs-treasury-bonds",
    group: "us-tips-vs-treasuries",
    section: "government",
    title: "TIPS vs. Treasury Bonds: What Inflation Protection Really Means",
    seoTitle: "TIPS vs. Treasury Bonds: Inflation and Real Returns",
    metaDescription: "How do TIPS protect against inflation? Compare inflation-protected Treasuries with conventional Treasury bonds using worked examples and real yields.",
    primaryKeyword: "TIPS vs treasury bonds",
    published: "2026-10-19",
    bodyHtml: `
<p><em>An ordinary Treasury pays fixed amounts of dollars. An inflation-protected Treasury adjusts its principal as prices change. Over a few years, that difference can do a great deal to what your money will actually buy.</em></p>
<p>The most important number on a bond statement is not always the yield. Sometimes it is what that yield will be worth on the day the money finally gets spent.</p>
<p>Take an investor who buys a conventional Treasury yielding 4%. Over the next five years, inflation averages 2%. The nominal interest payments look perfectly respectable, and the investor receives exactly the amounts the security promised. Yet each of those dollars buys a little less than it did, because prices have kept climbing.</p>
<p>Now run the same five years with inflation averaging 6% instead.</p>
<p>The Treasury still pays every contractual nominal coupon and its principal on time. There has been no default and not necessarily any nominal loss. The purchasing power, however, has been eaten away far more severely, quietly, the way a moth gets at a good coat.</p>
<p>Treasury Inflation-Protected Securities, known as TIPS, were designed to tackle exactly this gap between nominal money and real purchasing power.</p>
<p>Making sense of them means looking past their coupon rates.</p>
<h2 id="how-tips-work">How TIPS work</h2>
<p>TIPS are U.S. Treasury securities whose principal is adjusted in line with changes in the Consumer Price Index for All Urban Consumers, or CPI-U, according to the Treasury's applicable indexation methodology.</p>
<p>A conventional <a href="/knowledge/treasury-bills-notes-bonds">Treasury note or bond</a> has a fixed face value payable at maturity. A TIPS security instead has a principal amount that is adjusted for inflation.</p>
<p>When the relevant inflation index rises, the adjusted principal generally increases. In deflationary periods, it may shrink.</p>
<p>TIPS pay interest twice a year. The stated coupon rate is fixed at issue, but the dollar amount of each payment changes, because that rate is applied to the adjusted principal.</p>
<p>At maturity, the Treasury pays the greater of the inflation-adjusted principal or the original principal amount, under the applicable terms. An investor who buys TIPS in the secondary market at a premium should not assume that this floor guarantees getting back the price they personally paid.</p>
<p>This is not the same animal as a savings bond. TIPS are marketable securities, so investors can buy and sell them before maturity at whatever price the market sets.</p>
<h2 id="a-simple-illustration">A simple illustration</h2>
<p>Suppose an investor buys $10,000 of original principal in a hypothetical TIPS issue with a fixed coupon rate of 1.5%.</p>
<p>To keep things clean, assume the inflation adjustment over the first year is exactly 3%.</p>
<p>The adjusted principal would then rise from $10,000 to approximately $10,300. The annualized coupon rate is still 1.5%, but it now applies to the larger adjusted principal.</p>
<p>If the adjusted principal climbs again later, the dollar value of the interest payments climbs with it.</p>
<p>Now suppose a spell of deflation follows. The adjusted principal could fall, and the coupon payments calculated on it would fall too.</p>
<p>The principal adjustment, in other words, is not a one-way escalator. The protection is tied to inflation over the life of the security and to the contractual principal floor at maturity.</p>
<p>The key point is that the TIPS mechanism adjusts nominal cash flows to track the inflation index. It does not guarantee a positive real return once taxes, trading costs or changes in market value have had their say.</p>
<h2 id="nominal-yields-versus-real-yields">Nominal yields versus real yields</h2>
<p>Conventional Treasury yields are generally described as nominal yields. They measure returns in dollars that are not automatically adjusted for future inflation.</p>
<p>TIPS yields are quoted as real yields, because their principal is linked to inflation.</p>
<p>Put the two next to each other and something useful appears.</p>
<p>Suppose a conventional five-year Treasury yields 4%, while a comparable five-year TIPS yields 1.6% in real terms.</p>
<p>The gap of 2.4 percentage points is a widely used approximation of the market's five-year breakeven inflation rate.</p>
<p>If realized inflation turns out higher than that breakeven level, TIPS may outperform comparable nominal Treasuries on an appropriately measured basis. If realized inflation comes in lower, conventional Treasuries may do better.</p>
<p>The relationship is not exact. Inflation risk premiums, liquidity differences, indexation lags and other market factors can all nudge the observed spread between nominal and real yields.</p>
<p>Even so, comparing the two yields is a valuable way of seeing what investors are paying for inflation protection, a sort of insurance premium hiding in plain sight.</p>
<h2 id="inflation-protection-does-not-eliminate-interest-rate-risk">Inflation protection does not eliminate interest-rate risk</h2>
<p>One of the most widespread misconceptions about TIPS is that their prices cannot fall when inflation rises.</p>
<p>They can. TIPS are sensitive to changes in real interest rates.</p>
<p>Consider a long-maturity TIPS issue bought when real yields were relatively low. If real market yields then rise substantially, the security's price can fall, even while inflation is running hot.</p>
<p>The inflation adjustment protects the contractual principal mechanism. It does not shield the market price from changes in discount rates.</p>
<p>Duration matters here exactly as it does for conventional bonds.</p>
<p>A long-duration TIPS security can be strikingly volatile. An investor who needs to sell before maturity may realize a loss, inflation adjustments accumulated along the way notwithstanding.</p>
<p>So two questions deserve separate answers. How does the bond protect purchasing power over time? And how might its price behave if the investor sells before maturity?</p>
<h2 id="the-tax-complication-for-u-s-investors">The tax complication for U.S. investors</h2>
<p>TIPS come with a tax wrinkle that matters most in taxable brokerage accounts.</p>
<p>Under U.S. federal tax rules, an increase in a TIPS security's inflation-adjusted principal can generally create taxable income for the holder before that increase is actually received in cash.</p>
<p>Put plainly, an investor may owe federal income tax on an inflation adjustment while the extra principal is still sitting inside the security, out of reach.</p>
<p>The effect is sometimes called, informally and not affectionately, phantom income.</p>
<p>Interest and inflation adjustments on TIPS are generally subject to federal income tax, while Treasury interest receives favorable treatment under state and local income-tax rules.</p>
<p>The exact tax consequences depend on the holder's circumstances and on how and when the security was acquired.</p>
<p>For anyone weighing TIPS in a taxable account, the timing of the tax bill deserves as much attention as the advertised real yield.</p>
<h2 id="when-conventional-treasuries-and-tips-behave-differently">When conventional Treasuries and TIPS behave differently</h2>
<p>A conventional Treasury offers predictable nominal contractual payments. For someone planning future cash flows in dollars, that is about as straightforward as finance gets.</p>
<p>A TIPS security offers cash flows that move with the inflation adjustment. Its nominal payments are harder to predict, but the structure is built to protect against changes in the general price level.</p>
<p>Neither design wins in all weathers.</p>
<p>If inflation turns out unexpectedly low, the premium paid for inflation protection may leave conventional Treasuries the more rewarding choice.</p>
<p>If inflation runs well beyond what markets expected, TIPS may come out ahead.</p>
<p>The result also hangs on the purchase price, duration, the actual path of inflation and whether the security is held to maturity.</p>
<h2 id="a-meaningful-comparison-begins-with-matching-maturities">A meaningful comparison begins with matching maturities</h2>
<p>Comparing the nominal yield of a short Treasury bill with the real yield of a 30-year TIPS, without allowing for duration, tells you about as much as comparing a sprinter with a marathon runner on a stopwatch.</p>
<p>The more informative approach is to line up securities with similar remaining maturities and then see how their sensitivity to interest rates differs.</p>
<p>A five-year conventional Treasury and a five-year TIPS make a useful conceptual pairing, even though their precise durations and cash-flow structures may still differ.</p>
<p>The exercise is most revealing when inflation expectations shift, because prices reflect not only the level of inflation but also how future inflation compares with what markets had previously expected.</p>
<h2 id="understanding-the-broader-bond-market">Understanding the broader bond market</h2>
<p>TIPS illustrate a wider truth about fixed income: no single yield figure ever tells the whole story.</p>
<p>Nominal yield, real yield, duration and inflation exposure each measure a different side of the same instrument.</p>
<p>10BONDS takes a comparable analytical approach to euro-denominated government and corporate bonds, helping users explore securities by duration and yield while looking at their credit-risk characteristics.</p>
<p>The current bond finder does not claim to offer a dedicated TIPS comparison service. Its usefulness lies in making fixed-income comparisons more transparent.</p>
<p><a class="cta" href="/">Explore government and corporate bond comparisons on 10BONDS.</a></p>
<h3 id="sources-and-further-reading">Sources and further reading</h3>
<ul>
<li>U.S. Treasury — Treasury Inflation-Protected Securities: <a href="https://www.treasurydirect.gov/marketable-securities/tips/">https://www.treasurydirect.gov/marketable-securities/tips/</a></li>
<li>U.S. Treasury — Inflation-Protected Securities Regulations: <a href="https://www.treasurydirect.gov/laws-and-regulations/auction-regulations-uoc/inflation-protected-securities/">https://www.treasurydirect.gov/laws-and-regulations/auction-regulations-uoc/inflation-protected-securities/</a></li>
<li>Internal Revenue Service — Publication 550: <a href="https://www.irs.gov/publications/p550">https://www.irs.gov/publications/p550</a></li>
</ul>
<p><em>This material is for education only. The hypothetical yield and inflation assumptions are not current market quotations or investment recommendations.</em></p>
`,
  },
  {
    // The owner's own article for the US market (19 Oct 2026), published word for word.
    slug: "municipal-bonds-vs-treasuries",
    group: "us-municipal-vs-treasuries",
    section: "government",
    title: "Municipal Bonds vs. Treasury Bonds: Why the Highest Yield May Not Be the Best Comparison",
    seoTitle: "Municipal Bonds vs. Treasuries: Taxes and Yields",
    metaDescription: "Are municipal bonds better than Treasuries after taxes? Understand tax-equivalent yield, municipal credit risk and costs with practical examples.",
    primaryKeyword: "municipal bonds vs treasury bonds",
    published: "2026-10-19",
    bodyHtml: `
<p><em>For American bond investors, the tax code can rewrite the economics of a trade. A municipal bond yielding less than a Treasury may still put more spendable income in your pocket, depending on your circumstances.</em></p>
<p>Picture two bonds with similar maturities. A U.S. Treasury yields 4.2%; a municipal bond yields 3.2%.</p>
<p>On the face of it, the Treasury wins comfortably. Its stated yield is a full percentage point higher, and its credit is backed by the U.S. government.</p>
<p>An investor paying a relatively high marginal federal income-tax rate, however, may reach a different verdict once the taxman has taken his share.</p>
<p>If the municipal bond's interest is exempt from federal income tax, its lower stated yield can turn into a higher after-tax income stream.</p>
<p>That is one reason the municipal bond market holds such a distinctive place in American fixed-income investing.</p>
<p>In conventional <a href="/knowledge/corporate-bonds-vs-treasuries">corporate bond comparisons</a> the question is mostly how much income a security generates. Here it is just as much about how much of that income the investor gets to keep.</p>
<h2 id="what-are-municipal-bonds">What are municipal bonds?</h2>
<p>Municipal bonds are debt securities issued by state and local governments, and by certain public authorities or related entities.</p>
<p>The money raised may pay for infrastructure, transportation, schools, water systems and other public purposes. Some municipal bonds are backed by the general financial obligations of a government; others depend on the revenue generated by a particular facility or project.</p>
<p>The difference is not a technicality.</p>
<p>A general obligation bond may be supported by specified taxing powers or other general resources of the issuer. A revenue bond may rely mainly on the revenue produced by the project it financed, subject to its governing documents. One leans on the city; the other leans on the toll booth.</p>
<p>The two can have quite different credit characteristics even when issued within the same jurisdiction.</p>
<p>Municipal bonds may pay fixed or variable interest, and their terms can include call provisions, sinking funds or other features that affect when principal comes back.</p>
<p>For investors, the legal security behind the debt matters at least as much as the name of the municipality on the front.</p>
<h2 id="why-municipal-bond-yields-are-often-lower">Why municipal bond yields are often lower</h2>
<p>Many municipal bonds enjoy favorable federal income-tax treatment.</p>
<p>Under the applicable U.S. tax rules, interest on qualifying state and local government obligations is generally excluded from federal gross income.</p>
<p>That benefit shifts the price investors are prepared to pay.</p>
<p>A taxpayer facing a high marginal federal income-tax rate may accept a lower nominal yield on a tax-exempt municipal bond, because the income received is not reduced by federal income tax in the way taxable interest is.</p>
<p>For investors in lower tax brackets, the same advantage may be worth noticeably less.</p>
<p>The right comparison therefore depends partly on who is doing the comparing.</p>
<p>Not every municipal security is tax-exempt, mind. Certain municipal issues pay taxable interest, and some bonds may carry additional federal or state tax consequences.</p>
<p>A bond's tax status has to be checked in its official documents, not guessed from its name.</p>
<h2 id="tax-equivalent-yield-a-more-useful-comparison">Tax-equivalent yield: a more useful comparison</h2>
<p>Tax-equivalent yield converts the interest rate on a tax-exempt bond into the yield a fully taxable security would have to offer to produce the same after-tax income, under simplified assumptions.</p>
<p>The formula is:</p>
<p><strong>Tax-equivalent yield = Tax-exempt yield ÷ (1 − Marginal tax rate)</strong></p>
<p>Suppose a qualifying municipal bond yields 3.2% and the investor faces a 32% federal marginal tax rate.</p>
<p>The simplified federal tax-equivalent yield works out as:</p>
<p><strong>3.2% ÷ (1 − 0.32) = 4.71%</strong></p>
<p>On those assumptions, a fully federally taxable bond would need to yield approximately 4.71% to deliver the same after-federal-tax income.</p>
<p>A Treasury yielding 4.2% would leave approximately 2.86% after a 32% federal income tax, while the qualifying municipal bond would hang on to its full 3.2% federally tax-exempt yield.</p>
<table>
<thead><tr><th>Hypothetical investment</th><th>Yield before federal tax</th><th>Yield after 32% federal tax</th></tr></thead>
<tbody>
<tr><td>U.S. Treasury</td><td>4.20%</td><td>2.86%</td></tr>
<tr><td>Qualifying tax-exempt municipal bond</td><td>3.20%</td><td>3.20%</td></tr>
</tbody>
</table>
<p>In this simplified example, the municipal bond comes out ahead on an after-federal-tax basis.</p>
<p>That does not settle which security is preferable overall. The sum leaves out credit differences, state taxes, transaction costs and the small matter of the investor's tax circumstances changing.</p>
<h2 id="state-taxes-make-the-calculation-more-complicated">State taxes make the calculation more complicated</h2>
<p>Treasury interest is generally exempt from state and local income taxes, even though it is subject to federal income tax.</p>
<p>Municipal bond tax treatment is less uniform.</p>
<p>In many cases, interest on municipal bonds issued within the investor's own state of residence may receive favorable state income-tax treatment. Interest on obligations from other states may not get the same exemption.</p>
<p>For a resident of a state with substantial income taxes, those differences can tilt the after-tax comparison.</p>
<p>Anyone comparing a home-state municipal bond with a Treasury therefore has to look at the relevant federal and state rules together, rather than apply one national tax rate and hope for the best.</p>
<p>Some municipal bonds may also carry alternative minimum tax implications, depending on the nature of the issue and the applicable tax law.</p>
<p>All of which makes tax-equivalent yield a useful starting point, not the final word.</p>
<h2 id="municipal-credit-risk-is-not-the-same-as-treasury-credit-risk">Municipal credit risk is not the same as Treasury credit risk</h2>
<p>A tax advantage does not make credit risk disappear.</p>
<p>Municipal issuers differ in their revenue sources, financial obligations, debt burdens and legal protections.</p>
<p>A financially strong municipality with diversified revenues is not, economically speaking, the same creature as a single-purpose authority that depends on one revenue-generating facility.</p>
<p>The security behind a municipal bond may involve taxes, fees, utility revenues, project cash flows or other legally specified sources.</p>
<p>Credit ratings can help organize this information, but they are no substitute for understanding the issuer's financial condition and how the obligation is structured.</p>
<p><a href="/knowledge/treasury-bills-notes-bonds">U.S. Treasury securities</a>, by contrast, are backed by the federal government's full faith and credit.</p>
<p>Even when two securities have similar yields and duration, it would be a mistake to assume their credit risks are equivalent.</p>
<h2 id="trading-costs-can-be-overlooked">Trading costs can be overlooked</h2>
<p>Individual municipal bonds may trade relatively rarely.</p>
<p>Unlike heavily traded benchmark Treasuries, some municipal issues see only limited secondary-market activity.</p>
<p>That shapes the price an investor can get when buying or selling.</p>
<p>A quoted municipal yield may therefore not match exactly the yield available to a retail investor placing a particular trade.</p>
<p>Dealer markups, markdowns and the gap between bid and ask prices can materially affect returns, especially on smaller transactions.</p>
<p>The trade-off between tax savings and transaction costs deserves a hard look. A small annual tax advantage can be largely eaten up when buying or selling costs are unusually high.</p>
<p>The sensible comparison is between executable prices and net cash flows, not headline yields admired in isolation.</p>
<h2 id="duration-and-call-provisions-matter-too">Duration and call provisions matter too</h2>
<p>Municipal bonds are exposed to changes in market interest rates, just as Treasury and corporate bonds are.</p>
<p>When required yields rise, the market prices of existing fixed-rate securities generally fall.</p>
<p>Duration measures roughly how sensitive those prices are to changes in yields.</p>
<p>Some municipal bonds are also callable, which lets the issuer redeem them before their stated maturity.</p>
<p>That option tends to matter most when interest rates fall. The issuer may decide to refinance its existing debt, potentially cutting short the period in which the investor collects the original coupon. Issuers, like homeowners, rarely say no to a cheaper loan.</p>
<p>For callable bonds, yield to maturity alone may not be enough. Yield to call and yield to worst can add more useful information.</p>
<p>A high coupon is not automatically a selling point if the bond trades at a premium and could be redeemed early.</p>
<h2 id="what-should-a-fair-comparison-include">What should a fair comparison include?</h2>
<p>Take a municipal bond and a Treasury security with approximately five years left until maturity.</p>
<p>Begin with their yields and after-tax treatment. Then look at duration, credit risk, liquidity and any embedded call options.</p>
<p>Only once those differences are on the table can the extra income offered by one security be interpreted meaningfully.</p>
<p>An investor on a low marginal federal tax rate may see relatively little value in municipal tax exemptions. Another facing a much higher rate may find the after-tax comparison looks quite different.</p>
<p>That is why sweeping claims that municipal bonds are better or worse than Treasuries miss the central economic point.</p>
<p>The tax-equivalent calculation measures one dimension of value. The credit, maturity and liquidity analysis measures the others.</p>
<h2 id="putting-bond-yields-in-context">Putting bond yields in context</h2>
<p>Municipal bonds illustrate a broader principle: the most informative bond comparison is rarely the one that starts and ends with the highest advertised yield.</p>
<p>10BONDS concentrates on making bond characteristics easier to compare. Its current bond finder covers euro-denominated government and corporate bonds, producing a shortlist based on the duration and target yield the user selects.</p>
<p>The platform does not currently offer a dedicated U.S. municipal bond database. Its comparative approach rests on the same underlying principle, though: yield should be judged in the context of risk, maturity and market conditions.</p>
<p><a class="cta" href="/">Explore bond comparisons on 10BONDS.</a></p>
<h3 id="sources-and-further-reading">Sources and further reading</h3>
<ul>
<li>IRS — Publication 550, Investment Income and Expenses: <a href="https://www.irs.gov/publications/p550">https://www.irs.gov/publications/p550</a></li>
<li>SEC Investor.gov — Bonds and Fixed-Income Securities: <a href="https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds-or-fixed-income-products">https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds-or-fixed-income-products</a></li>
<li>Municipal Securities Rulemaking Board: <a href="https://www.msrb.org/">https://www.msrb.org/</a></li>
<li>EMMA Municipal Securities Disclosure Platform: <a href="https://emma.msrb.org/">https://emma.msrb.org/</a></li>
</ul>
<p><em>This article offers general educational information. The tax examples are simplified, and actual treatment depends on applicable laws and the investor's circumstances. No particular security is recommended.</em></p>
`,
  },
  {
    slug: "uk-gilts",
    group: "uk-gilts",
    section: "government",
    title: "UK Gilts Explained: Yields, Tax, Index-Linked Gilts and How to Buy Them",
    seoTitle: "UK Gilts Explained: Yields, Tax and How to Buy",
    metaDescription: "What gilts are, how gilt prices and yields work, how index-linked and low coupon gilts are taxed, and the ways to buy UK government bonds.",
    primaryKeyword: "gilts",
    published: "2026-10-24",
    bodyHtml: `
<p><strong>Gilts</strong> are the IOUs of the British state. Buy one and you are lending money to HM Treasury, which pays you interest and hands back the face value on a set date. The UK Debt Management Office (DMO) issues and looks after them on the Treasury's behalf.</p>
<p>The name comes from the gilded edges of the paper certificates of old, a flourish meant to signal just how safe they were thought to be. The certificates have long since given way to electronic records, but gilts remain the benchmark against which every other sterling interest rate is measured.</p>
<h2 id="what-are-gilts">What are gilts?</h2>
<p>Gilts come in two main families.</p>
<ul>
<li><strong>Conventional gilts</strong> pay a fixed coupon every six months and repay £100 for every £100 of face value at maturity. Unusually for finance, the name tells you almost everything: a bond called "4¼% Treasury Gilt 2032" pays £4.25 a year per £100 of face value, in two instalments, and matures in 2032.</li>
<li><strong>Index-linked gilts</strong> adjust both the coupon and the amount repaid for inflation, as measured by the Retail Prices Index (RPI). The government has announced that the RPI method will be aligned with CPIH from 2030, a detail that matters for long-dated index-linked gilts.</li>
</ul>
<p>By remaining life, gilts are usually sorted into <em>shorts</em> (up to about 7 years), <em>mediums</em> (about 7 to 15 years) and <em>longs</em> (over 15 years).</p>
<h2 id="gilt-prices-and-yields">Gilt prices and gilt yields</h2>
<p>Gilts trade every day, and their prices do not sit still. When market interest rates rise, the price of an existing fixed-coupon gilt falls until a new buyer can earn a competitive return on it. When rates fall, the price rises. Price and yield are on opposite ends of a seesaw, always.</p>
<p>The number that lets you compare one gilt with another is the <a href="/knowledge/yield-to-maturity">yield to maturity</a>: the annual return you would earn by buying at today's price and holding until repayment. A gilt priced at £95 with a 1% coupon and a gilt priced at £102 with a 5% coupon can end up with similar yields to maturity, which is why coupons alone make a poor guide.</p>
<p>How sharply a gilt's price reacts to a change in rates depends on its <a href="/knowledge/bond-duration">duration</a>. Long gilts can move a great deal: a one-point rise in yields can knock well over 10% off the price of a long-dated gilt.</p>
<h2 id="10-year-gilt-yield">The 10-year gilt yield and the UK yield curve</h2>
<p>The <strong>10-year gilt yield</strong> is the most quoted gauge of what it costs the UK government to borrow. Mortgage rates, annuity rates and corporate bond yields are all priced with one eye on gilt yields.</p>
<p>Plot gilt yields from the shortest maturities to the longest and you have the <strong>UK yield curve</strong>. Normally long gilts yield more than short ones, as compensation for locking money away for longer. When short yields climb above long ones, the curve is said to be inverted, which markets often take as a sign that interest rates are expected to fall. The Bank of England and the DMO publish gilt prices and yields daily, for those who like that sort of bedtime reading.</p>
<h2 id="gilts-tax">How gilts are taxed in the UK</h2>
<p>For individual UK investors, tax is where gilts really set themselves apart:</p>
<ul>
<li><strong>Gains are free of Capital Gains Tax.</strong> Any profit from buying a gilt below its repayment value, or from selling it for more than you paid, is outside the scope of CGT.</li>
<li><strong>Coupons are taxed as savings income.</strong> Interest is paid gross and counts towards your Personal Savings Allowance; beyond that, income tax applies at your marginal rate.</li>
<li><strong>Wrappers remove the tax.</strong> Gilts held in a stocks and shares ISA or a SIPP pay their coupons free of income tax.</li>
<li><strong>The accrued income scheme</strong> can apply to interest built up between coupon dates when you buy or sell, if your total holdings of such securities exceed £5,000 face value.</li>
</ul>
<p>Rules change, and they depend on personal circumstances. HMRC guidance or a tax adviser is the place to confirm where you stand.</p>
<h2 id="low-coupon-gilts">Why low coupon gilts attract taxpayers</h2>
<p>Gilts issued when rates were on the floor carry tiny coupons, such as 0.125% or 0.25%, and now trade well below £100. Most of their return comes not from the taxed coupons but from the price climbing back to £100 at maturity, which for individuals is a tax-free gain.</p>
<p>For a higher-rate taxpayer holding outside an ISA or pension, a low coupon gilt can therefore keep noticeably more of its return after tax than a high coupon gilt with the same yield to maturity. It is one of the few corners of the tax system where boring is rewarded. Inside an ISA or SIPP the advantage vanishes, since neither part is taxed there.</p>
<h2 id="how-to-buy-gilts">How to buy gilts</h2>
<p>There are three well-trodden routes.</p>
<ol>
<li><strong>Through a broker or investment platform.</strong> Most UK platforms let you buy individual gilts on the London Stock Exchange, in a general account, an ISA or a SIPP. Look closely at the dealing fee, any custody fee and the minimum trade size, because costs vary widely from one provider to the next.</li>
<li><strong>Directly at a DMO auction.</strong> Private investors can buy new gilts at auction, and sell gilts, through the DMO's Purchase and Sale Service, run by Computershare, once they have joined its Approved Group of Investors. You pay the auction price and costs are low, but you can only buy when a gilt is actually being auctioned.</li>
<li><strong>Through a fund or ETF.</strong> A gilt fund holds many gilts at once and never matures, so its value keeps moving with interest rates indefinitely. That is a different risk from holding a single gilt until the day it is repaid.</li>
</ol>
<h2 id="choosing-gilts">How to choose between gilts</h2>
<p>No single gilt suits everyone. Three questions usually do most of the narrowing:</p>
<ul>
<li><strong>When do you need the money?</strong> A gilt that matures close to that date spares you from selling at whatever price the market happens to offer.</li>
<li><strong>How are you taxed?</strong> Outside a wrapper, compare gilts on what you keep after tax, a test that can favour low coupon gilts.</li>
<li><strong>Do you need protection from inflation?</strong> Index-linked gilts protect the real value of your money, but their prices can be volatile, especially at long maturities.</li>
</ul>
<p>Gilts are also the ruler against which UK <em>retail bonds</em> and other corporate bonds are measured: the extra yield a company pays over a gilt of similar maturity is the reward for taking on its <a href="/knowledge/bond-credit-risk">credit risk</a>. The guide on <a href="/knowledge/government-vs-corporate-bonds">government and corporate bonds</a> sets out the trade-off.</p>
<h2 id="faq">FAQ</h2>
<h3>Are gilts safe?</h3>
<p>Gilts carry very low credit risk, since the UK government stands behind them. Their prices can still fall before maturity if interest rates rise, so the return is only known in advance if you hold the gilt until it is repaid.</p>
<h3>Do I pay Capital Gains Tax on gilts?</h3>
<p>No. For individual investors, gains on gilts are exempt from Capital Gains Tax. The coupon interest, however, is taxable as savings income unless the gilt sits in an ISA or a pension.</p>
<h3>Can I hold gilts in an ISA?</h3>
<p>Yes. Gilts can go in a stocks and shares ISA, where the coupons are paid free of income tax.</p>
<h3>What is the difference between a gilt and a Premium Bond?</h3>
<p>A gilt pays a set coupon and repays its face value on a fixed date. A Premium Bond pays no interest at all: its return comes from tax-free prizes drawn each month. The guide on <a href="/knowledge/premium-bonds-vs-gilts">Premium Bonds vs gilts and savings</a> puts them side by side.</p>
<h2 id="10bonds">Comparing bonds on 10BONDS</h2>
<p>The 10BONDS finder currently covers euro-denominated government and corporate bonds, not gilts. The principle travels well between the two markets, though: weigh return together with duration and risk, and never look at return on its own.</p>
<p><a class="cta" href="/">Explore bond comparisons on 10BONDS</a></p>
<h3 id="sources">Sources and further reading</h3>
<ul>
<li>UK Debt Management Office — gilt market and private investors: <a href="https://www.dmo.gov.uk/">https://www.dmo.gov.uk/</a></li>
<li>HMRC — Savings and Investment Manual, accrued income scheme: <a href="https://www.gov.uk/hmrc-internal-manuals/savings-and-investment-manual">https://www.gov.uk/hmrc-internal-manuals/savings-and-investment-manual</a></li>
<li>Bank of England — yield curves: <a href="https://www.bankofengland.co.uk/statistics/yield-curves">https://www.bankofengland.co.uk/statistics/yield-curves</a></li>
</ul>
<p><em>This article offers general educational information. Tax treatment depends on individual circumstances and may change. No particular security is recommended.</em></p>
`,
  },
  {
    slug: "premium-bonds-vs-gilts",
    group: "uk-premium-bonds",
    section: "government",
    title: "Premium Bonds vs. Gilts vs. Savings Accounts: Which Fits Your Money?",
    seoTitle: "Premium Bonds vs Gilts vs Savings: How They Compare",
    metaDescription: "Premium Bonds, gilts and savings accounts compared: how each pays, tax, safety, access to your money and how to compare their returns fairly.",
    primaryKeyword: "premium bonds",
    published: "2026-10-24",
    bodyHtml: `
<p>Premium Bonds, gilts and savings accounts are three of the places the British most like to park their cash. All three count as low risk, yet each pays you in a completely different way: one by lottery, one by contract and one at the bank's discretion. That difference decides which of them fits a particular goal.</p>
<h2 id="what-are-premium-bonds">What are Premium Bonds?</h2>
<p>Premium Bonds are issued by National Savings &amp; Investments (NS&amp;I), which is backed by HM Treasury. They pay no interest whatsoever. Instead, every £1 bond goes into a monthly prize draw, with prizes running from £25 all the way up to £1 million.</p>
<ul>
<li>You can hold from £25 up to £50,000.</li>
<li>Prizes are free of UK income tax and Capital Gains Tax.</li>
<li>You can cash in at any time without penalty, and you always get back what you put in.</li>
<li>New bonds join the draws once they have been held for one full calendar month.</li>
</ul>
<p>NS&amp;I publishes a <strong>prize fund rate</strong>: the total paid out in prizes as a share of all bonds. It is an average across every holder, not a forecast of what you will earn. Because prizes are random, many holders receive less than that rate in any given year and a lucky few receive a great deal more, which is rather the point of a draw.</p>
<h2 id="how-gilts-pay">How gilts pay</h2>
<p><a href="/knowledge/uk-gilts">Gilts</a> are UK government bonds. A conventional gilt pays a fixed coupon every six months and repays its face value on a known date. Buy and hold until maturity and you know your return on the day you buy: it is the gilt's yield to maturity. No luck required.</p>
<p>Before maturity the price moves with interest rates, so selling early can bring a gain or a loss. For individuals, gains on gilts are free of Capital Gains Tax, while coupons are taxed as savings income unless the gilt sits inside an ISA or a pension.</p>
<h2 id="savings-accounts">How savings accounts pay</h2>
<p>A savings account pays interest at a rate the bank sets, either variable (easy access) or fixed for a term. Interest above your Personal Savings Allowance is taxable, unless the account is a cash ISA. Deposits at UK banks are protected by the Financial Services Compensation Scheme (FSCS) up to its limit per person, per banking group.</p>
<h2 id="side-by-side">Side by side</h2>
<table>
<thead><tr><th></th><th>Premium Bonds</th><th>Gilts</th><th>Savings account</th></tr></thead>
<tbody>
<tr><td>Return</td><td>Random tax-free prizes</td><td>Fixed coupons plus repayment</td><td>Interest set by the bank</td></tr>
<tr><td>Known in advance?</td><td>No</td><td>Yes, if held to maturity</td><td>Yes for fixed rates, no for variable</td></tr>
<tr><td>Backed by</td><td>HM Treasury, no limit</td><td>UK government</td><td>FSCS, up to its limit</td></tr>
<tr><td>Tax for individuals</td><td>Prizes tax-free</td><td>Gains tax-free, coupons taxable</td><td>Interest taxable above allowance</td></tr>
<tr><td>Access</td><td>Cash in any time at face value</td><td>Sell any trading day at market price</td><td>Depends on the account</td></tr>
</tbody>
</table>
<h2 id="compare-fairly">How to compare the returns fairly</h2>
<p>The only fair comparison is <strong>after tax</strong>, and over the period you actually plan to hold.</p>
<ul>
<li>For a basic-rate taxpayer who has used up their Personal Savings Allowance, a savings rate of 5% leaves 4% after tax. A higher-rate taxpayer keeps 3%.</li>
<li>For Premium Bonds, the prize fund rate is already tax-free, but your own result can fall well short of it. Treat it as an average, not a rate.</li>
<li>For gilts, low coupon gilts held outside a wrapper turn most of the return into tax-free gain, which can make their after-tax yield competitive with taxed savings.</li>
</ul>
<p>A simple rule of thumb follows. If you need certainty about what you will earn, a fixed-rate account or a gilt held to maturity provides it, and Premium Bonds do not. If you want instant access with no price risk, Premium Bonds and easy-access accounts provide it, and a long gilt does not. Nobody gets everything, which is roughly how you know the market is working.</p>
<h2 id="faq">FAQ</h2>
<h3>Are Premium Bonds better than gilts?</h3>
<p>Neither wins in general. Premium Bonds offer tax-free prizes and instant access at face value, in exchange for an uncertain return. Gilts offer a return known in advance if held to maturity, with tax-free gains for individuals, but their price moves around before then.</p>
<h3>Can you lose money on Premium Bonds?</h3>
<p>You always get back the amount you put in, but inflation can erode its value if your prizes are small. A year of holding Premium Bonds without a single win amounts to a real loss of purchasing power, however intact the balance looks.</p>
<h3>What is the maximum you can hold in Premium Bonds?</h3>
<p>The maximum holding is £50,000 per person, and the minimum purchase is £25.</p>
<h2 id="10bonds">Comparing bonds on 10BONDS</h2>
<p>The 10BONDS finder covers euro-denominated government and corporate bonds. The principle holds in any market: compare what you keep after tax, alongside how long your money is tied up and how much risk you are taking to earn it.</p>
<p><a class="cta" href="/">Explore bond comparisons on 10BONDS</a></p>
<h3 id="sources">Sources and further reading</h3>
<ul>
<li>NS&amp;I — Premium Bonds: <a href="https://www.nsandi.com/products/premium-bonds">https://www.nsandi.com/products/premium-bonds</a></li>
<li>UK Debt Management Office — gilts for private investors: <a href="https://www.dmo.gov.uk/">https://www.dmo.gov.uk/</a></li>
<li>Financial Services Compensation Scheme: <a href="https://www.fscs.org.uk/">https://www.fscs.org.uk/</a></li>
</ul>
<p><em>This article offers general educational information. Tax treatment depends on individual circumstances and may change. No particular product is recommended.</em></p>
`,
  },
  {
    slug: "i-bonds",
    group: "us-i-bonds",
    section: "government",
    title: "Series I Bonds Explained: How the Rate Works, Limits, Taxes and When to Cash In",
    seoTitle: "I Bonds Explained: Rates, Limits, Taxes and Calculation",
    metaDescription: "How Series I savings bonds work: the fixed and inflation rate, how the composite rate is calculated, purchase limits, taxes and the rules for cashing in.",
    primaryKeyword: "i bonds",
    published: "2026-10-24",
    bodyHtml: `
<p><strong>Series I savings bonds</strong>, known to their fans simply as I bonds, are savings bonds sold by the U.S. Treasury to protect your money against inflation. They cannot lose value, and their interest rate goes up when inflation does.</p>
<p>They never touch a trading floor. You buy them from the Treasury, keep them in your own account and, when the time comes, cash them in with the Treasury. That makes them simpler than marketable bonds, and also a good deal less flexible: think of a savings jar with a very reliable lid.</p>
<h2 id="how-the-rate-works">How the I bond rate works</h2>
<p>An I bond earns a <strong>composite rate</strong> made of two ingredients:</p>
<ul>
<li>a <strong>fixed rate</strong>, set when you buy the bond and kept for its whole life;</li>
<li>an <strong>inflation rate</strong>, based on changes in the Consumer Price Index (CPI-U) and reset every six months.</li>
</ul>
<p>The Treasury announces new rates every May 1 and November 1. Each bond's own rate then changes every six months, counted from its issue date.</p>
<h2 id="calculation">How to calculate the I bond rate</h2>
<p>The Treasury's formula, which looks fiddlier than it is, reads:</p>
<p><em>Composite rate = fixed rate + (2 × semiannual inflation rate) + (fixed rate × semiannual inflation rate)</em></p>
<p>Take, for example, a fixed rate of 1.00% and a semiannual inflation rate of 1.50%:</p>
<p><em>0.0100 + (2 × 0.0150) + (0.0100 × 0.0150) = 0.04015</em>, which gives a composite rate of about <strong>4.02%</strong> a year for the next six months.</p>
<p>Should inflation turn negative, the composite rate can drop, but never below zero: an I bond does not give back the value it has already earned. Interest is added to the bond every month and compounds every six months, and it keeps accruing for up to 30 years, which is longer than most people keep a car, a sofa or a strong opinion.</p>
<h2 id="limits">How much you can buy</h2>
<ul>
<li>Electronic I bonds are bought through <strong>TreasuryDirect</strong>, the Treasury's own website, and not through a bank or broker.</li>
<li>The minimum is $25, with any amount to the cent above that.</li>
<li>The limit is <strong>$10,000 per person per calendar year</strong>. Separate entities, such as a trust or a business, have limits of their own, and you can buy bonds as a gift for someone else, subject to that person's limit when the gift is delivered.</li>
<li>Paper I bonds bought with a federal tax refund are no longer available: the IRS ended that option from January 2025.</li>
</ul>
<h2 id="cashing-in">When you can cash in</h2>
<p>The rules are short and strict, so they are worth knowing before you buy.</p>
<ul>
<li>You must hold an I bond for at least <strong>12 months</strong>.</li>
<li>Cash in before <strong>5 years</strong> and you lose the last 3 months of interest.</li>
<li>After 5 years there is no penalty; after 30 years the bond stops earning interest.</li>
</ul>
<p>Because the fixed rate lasts for the life of the bond while the inflation part keeps changing, an older bond with a higher fixed rate can be worth hanging on to even when new bonds are on sale.</p>
<h2 id="taxes">How I bonds are taxed</h2>
<ul>
<li>Interest is subject to <strong>federal income tax</strong> but exempt from <strong>state and local income tax</strong>.</li>
<li>You can defer federal tax until you cash in the bond or it stops earning interest, or choose to report the interest each year.</li>
<li>Interest may be tax-free if used for qualified higher education expenses, subject to income limits and other conditions.</li>
</ul>
<h2 id="i-bonds-vs-tips">I bonds vs. TIPS</h2>
<p>Both guard against inflation, by different means. TIPS are marketable Treasury securities: you can buy any amount through a broker, and their price moves every day. I bonds are capped at $10,000 a year and never lose value, but they cannot be sold to anyone else; they are strictly between you and the Treasury. The guide on <a href="/knowledge/tips-vs-treasury-bonds">TIPS vs. Treasury bonds</a> explains how TIPS behave.</p>
<h2 id="faq">FAQ</h2>
<h3>Can I bonds lose money?</h3>
<p>No. The composite rate cannot go below zero, and value already earned is never clawed back. The only cost is the 3 months of interest you forgo if you cash in before 5 years.</p>
<h3>How much can I invest in I bonds each year?</h3>
<p>Up to $10,000 in electronic I bonds per person per calendar year, bought through TreasuryDirect.</p>
<h3>Are I bonds taxed by my state?</h3>
<p>No. I bond interest is exempt from state and local income tax. It is subject to federal income tax, which you can put off until you cash in.</p>
<h2 id="10bonds">Comparing bonds on 10BONDS</h2>
<p>I bonds are savings bonds rather than tradable bonds, so they sit outside the 10BONDS finder, which covers euro-denominated government and corporate bonds. For marketable U.S. Treasuries, see <a href="/knowledge/treasury-bills-notes-bonds">Treasury bills, notes and bonds</a> and <a href="/knowledge/how-to-buy-treasury-bills">how to buy them</a>.</p>
<p><a class="cta" href="/">Explore bond comparisons on 10BONDS</a></p>
<h3 id="sources">Sources and further reading</h3>
<ul>
<li>TreasuryDirect — I bonds: <a href="https://www.treasurydirect.gov/savings-bonds/i-bonds/">https://www.treasurydirect.gov/savings-bonds/i-bonds/</a></li>
<li>TreasuryDirect — I bond interest rates: <a href="https://www.treasurydirect.gov/savings-bonds/i-bonds/i-bonds-interest-rates/">https://www.treasurydirect.gov/savings-bonds/i-bonds/i-bonds-interest-rates/</a></li>
<li>IRS — Publication 550, Investment Income and Expenses: <a href="https://www.irs.gov/publications/p550">https://www.irs.gov/publications/p550</a></li>
</ul>
<p><em>This article offers general educational information. Rates, limits and tax rules are set by the U.S. Treasury and the IRS and may change. No particular security is recommended.</em></p>
`,
  },
  {
    slug: "how-to-buy-treasury-bills",
    group: "us-buy-treasuries",
    section: "government",
    title: "How to Buy Treasury Bills, Notes and Bonds, and How T-Bills Compare With CDs",
    seoTitle: "How to Buy T-Bills and Treasury Bonds, and T-Bills vs CDs",
    metaDescription: "Step by step: buying T-bills, Treasury notes and bonds through TreasuryDirect or a broker, reading the quoted rates, taxes, and how T-bills compare with CDs.",
    primaryKeyword: "how to buy t-bills",
    published: "2026-10-24",
    bodyHtml: `
<p>Lending money to the U.S. government is less exclusive than it sounds. Anyone with a U.S. bank account can buy Treasury bills, notes and bonds, in amounts as small as $100. There are two main routes in, and the one you pick decides how easily you can get out again before maturity.</p>
<p>If you have not yet settled on a maturity, start with <a href="/knowledge/treasury-bills-notes-bonds">Treasury bills vs. notes vs. bonds</a>.</p>
<h2 id="t-bill-basics">T-bill basics</h2>
<ul>
<li>Treasury bills mature in <strong>4, 6, 8, 13, 17, 26 or 52 weeks</strong>.</li>
<li>They are sold at a discount and repay their full face value at maturity; the gap between the two is your interest.</li>
<li>The minimum purchase is <strong>$100</strong>, in multiples of $100.</li>
<li>Most bills are auctioned every week; the 52-week bill is auctioned every four weeks.</li>
</ul>
<h2 id="treasurydirect">Option 1: buy through TreasuryDirect</h2>
<ol>
<li>Open an account on TreasuryDirect, the Treasury's own website, and link it to your bank account.</li>
<li>Pick the security and term, and place a <strong>non-competitive bid</strong>: you accept whatever rate the auction sets and, in return, are guaranteed to receive the security.</li>
<li>The Treasury takes the payment from your bank on the issue date and pays back the face value at maturity. You can also choose to roll the money automatically into a new bill.</li>
</ol>
<p>TreasuryDirect charges no fees, which is refreshing. The price is flexibility: you cannot sell a security on TreasuryDirect before maturity. To sell early you first have to transfer it to a broker, and that is possible only after you have held it for 45 days. Plan accordingly.</p>
<h2 id="broker">Option 2: buy through a broker</h2>
<ol>
<li>Most brokerage accounts let you bid at the next auction, just as on TreasuryDirect, or buy existing bills, notes and bonds on the secondary market.</li>
<li>On the secondary market you can choose from a wide spread of maturity dates, not only the ones on this week's auction menu.</li>
<li>You can sell at the market price on any trading day. Many large brokers charge no commission on Treasuries bought online, but keep an eye on the price spread you pay, which is where "free" trades tend to keep their costs.</li>
</ol>
<h2 id="how-to-buy-treasury-bonds">Buying Treasury notes and bonds</h2>
<p>Notes (2 to 10 years) and bonds (20 or 30 years) are bought in exactly the same way, at auction or on the secondary market. What changes is the risk: their prices move far more with interest rates. If there is any chance you will need the money before maturity, read up on <a href="/knowledge/bond-duration">duration</a> before buying a long bond.</p>
<h2 id="quoted-rates">Reading the quoted rate</h2>
<p>T-bills often come with two numbers attached, which is one more than most people want. The <strong>discount rate</strong> is calculated on the face value and on a 360-day year, so it understates your return. The <strong>investment rate</strong> (also called the coupon-equivalent or bond-equivalent yield) is calculated on the price you actually pay and on a 365-day year. When setting a T-bill against a CD or a savings account, use the investment rate.</p>
<h2 id="taxes">Taxes</h2>
<p>Interest on Treasury bills, notes and bonds is subject to <strong>federal income tax</strong> but exempt from <strong>state and local income tax</strong>. For a T-bill, the interest is the difference between the price paid and the face value, and it is taxed in the year the bill matures.</p>
<h2 id="t-bills-vs-cds">T-bills vs. CDs</h2>
<table>
<thead><tr><th></th><th>Treasury bills</th><th>Bank CDs</th></tr></thead>
<tbody>
<tr><td>Backed by</td><td>U.S. government</td><td>FDIC insurance, up to $250,000 per depositor, per bank, per ownership category</td></tr>
<tr><td>State income tax</td><td>Exempt</td><td>Taxable</td></tr>
<tr><td>Getting money back early</td><td>Sell at market price (via a broker)</td><td>Early withdrawal penalty (bank CDs) or sell at market price (brokered CDs)</td></tr>
<tr><td>Terms</td><td>4 weeks to 1 year</td><td>Usually 3 months to 5 years or more</td></tr>
</tbody>
</table>
<p>The state tax exemption counts for most in high-tax states. Here is a quick way to compare: divide the T-bill's investment rate by (1 − your state tax rate) to find the CD rate you would need to match it. With a T-bill at 4.0% and a 6% state tax, a CD would need about 4.26% to leave you in the same place after state tax.</p>
<h2 id="faq">FAQ</h2>
<h3>What is the minimum to buy a T-bill?</h3>
<p>$100, in multiples of $100, whether you buy through TreasuryDirect or at auction through a broker.</p>
<h3>Can I sell a T-bill before it matures?</h3>
<p>Yes, through a broker, at the market price. Bills held in TreasuryDirect have to be transferred to a broker first, which is allowed after 45 days.</p>
<h3>Are T-bills better than CDs?</h3>
<p>Neither wins across the board. T-bills are exempt from state income tax and can be sold before maturity; CDs may offer longer terms and sometimes higher rates. Compare them after tax, using the T-bill's investment rate.</p>
<h2 id="10bonds">Comparing bonds on 10BONDS</h2>
<p>The 10BONDS finder covers euro-denominated government and corporate bonds rather than U.S. Treasuries. The method, however, is the same one that applies here: judge return together with time to maturity and risk, never in splendid isolation.</p>
<p><a class="cta" href="/">Explore bond comparisons on 10BONDS</a></p>
<h3 id="sources">Sources and further reading</h3>
<ul>
<li>TreasuryDirect — Treasury bills: <a href="https://www.treasurydirect.gov/marketable-securities/treasury-bills/">https://www.treasurydirect.gov/marketable-securities/treasury-bills/</a></li>
<li>TreasuryDirect — buying a Treasury marketable security: <a href="https://www.treasurydirect.gov/marketable-securities/buying-a-marketable-security/">https://www.treasurydirect.gov/marketable-securities/buying-a-marketable-security/</a></li>
<li>FDIC — deposit insurance: <a href="https://www.fdic.gov/resources/deposit-insurance">https://www.fdic.gov/resources/deposit-insurance</a></li>
</ul>
<p><em>This article offers general educational information. Rates, auction schedules and tax rules may change. No particular security is recommended.</em></p>
`,
  },
];
