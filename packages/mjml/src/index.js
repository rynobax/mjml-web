import mjml2html, { registerComponent } from 'mjml-core'
import { registerDependencies } from 'mjml-validator'

import { Social, SocialElement } from 'mjml-social'
import { Navbar, NavbarLink } from 'mjml-navbar'
import { Carousel, CarouselImage } from 'mjml-carousel'
import {
  Accordion,
  AccordionElement,
  AccordionText,
  AccordionTitle,
} from 'mjml-accordion'

import Body from 'mjml-body'
import Head from 'mjml-head'
import Attributes from 'mjml-head-attributes'
import Breakpoint from 'mjml-head-breakpoint'
import Font from 'mjml-head-font'
import Preview from 'mjml-head-preview'
import Style from 'mjml-head-style'
import Title from 'mjml-head-title'

import Hero from 'mjml-hero'
import Button from 'mjml-button'
import Column from 'mjml-column'
import Divider from 'mjml-divider'
import Group from 'mjml-group'
import Image from 'mjml-image'
import Raw from 'mjml-raw'
import Section from 'mjml-section'
import Space from 'mjml-spacer'
import Text from 'mjml-text'
import Table from 'mjml-table'
import Wrapper from 'mjml-wrapper'

import Dependencies from './dependencies'

registerComponent(Body)
registerComponent(Head)
registerComponent(Attributes)
registerComponent(Breakpoint)
registerComponent(Font)
registerComponent(Preview)
registerComponent(Style)
registerComponent(Title)
registerComponent(Hero)
registerComponent(Button)
registerComponent(Column)
registerComponent(Divider)
registerComponent(Group)
registerComponent(Image)
registerComponent(Raw)
registerComponent(Section)
registerComponent(Space)
registerComponent(Text)
registerComponent(Table)
registerComponent(Wrapper)

registerComponent(Social)
registerComponent(SocialElement)
registerComponent(Navbar)
registerComponent(NavbarLink)
registerComponent(Accordion)
registerComponent(AccordionElement)
registerComponent(AccordionText)
registerComponent(AccordionTitle)
registerComponent(Carousel)
registerComponent(CarouselImage)

registerDependencies(Dependencies)

export default mjml2html
